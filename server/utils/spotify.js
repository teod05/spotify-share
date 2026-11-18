import { supabase } from "../db.js";

const client_id = process.env.CLIENT_ID
const client_secret = process.env.CLIENT_SECRET

export function parseSpotifyTrackLink(link) {
    if (!link || typeof link !== 'string') {
        return null
    }

    const trimmed = link.trim()
    
    // Spotify can share a track as a URI or as a web URL. We accept both so
    // users don't have to convert one into the other.
    const uriMatch = trimmed.match(/^spotify:track:([a-zA-Z0-9]+)$/)
    if (uriMatch) {
        return uriMatch[1]
    }
    
    // Shared URLs carry tracking parameters such as `?si=`. We keep only the ID
    // so the same song always gets stored as the same link.
    const urlMatch = trimmed.match(/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/)
    if (urlMatch) {
        return urlMatch[1]
    }
    
    return null
}

export function normalizeSpotifyTrackLink(link) {
    const trackId = parseSpotifyTrackLink(link)
    if (!trackId) {
        return null
    }
    return `https://open.spotify.com/track/${trackId}`
}

export async function getTrackMetadata(trackLink) {
    try {
        const normalized = normalizeSpotifyTrackLink(trackLink)
        if (!normalized) {
            return null
        }
        
        // The public oEmbed endpoint needs no user token. This lets us show the
        // title and cover even when the user's Spotify connection has expired.
        const response = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(normalized)}`)
        if (!response.ok) {
            return null
        }
        
        const data = await response.json()
        return {
            title: data.title || 'Unknown Track',
            thumbnail_url: data.thumbnail_url || null
        }
    } catch (error) {
        console.error('Error fetching track metadata:', error)
        return null
    }
}

async function refreshAccessToken(refreshToken) {
    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken
        })
    })

    if (!response.ok) {
        const error = await response.text()
        throw new Error(`Failed to refresh token: ${error}`)
    }

    const data = await response.json()
    return data.access_token
}

// Adds the song with the owner's own Spotify account and not a shared app
// account. That way, the playlist shows who added each song.
export async function addSongToPlaylist(songId, songLink, userId) {
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, name, refresh_token, playlist_id')
        .eq('id', userId)
        .single()

    if (userError || !user) {
        throw new Error('User not found')
    }

    if (!user.refresh_token) {
        throw new Error('User has no Spotify connection')
    }

    // Spotify access tokens expire after one hour and the drop runs once a week.
    // That's why we store only the refresh token and get a new access token here.
    const accessToken = await refreshAccessToken(user.refresh_token)

    let playlistId = process.env.SPOTIFY_PLAYLIST_ID

    if (user.playlist_id) {
        const { data: playlist, error: playlistError } = await supabase
            .from('playlist')
            .select('playlist_link')
            .eq('playlist_id', user.playlist_id)
            .maybeSingle()

        if (!playlistError && playlist?.playlist_link) {
            const match = playlist.playlist_link.match(/playlist\/([a-zA-Z0-9]+)/)
            if (match) {
                playlistId = match[1]
            }
        }
    }

    if (!playlistId) {
        throw new Error('No playlist ID found')
    }

    const trackId = parseSpotifyTrackLink(songLink)
    if (!trackId) {
        throw new Error('Invalid track link')
    }

    const trackUri = `spotify:track:${trackId}`

    const addResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            uris: [trackUri]
        })
    })

    if (!addResponse.ok) {
        const error = await addResponse.text()
        throw new Error(`Failed to add song to playlist: ${error}`)
    }

    // Warning: the song is already in the playlist at this point. If this update
    // fails, posted_at stays empty and the next drop adds the song a second time.
    const now = new Date().toISOString()
    const { error: updateError } = await supabase
        .from('songs')
        .update({ posted_at: now })
        .eq('id', songId)

    if (updateError) {
        throw new Error('Failed to update song status')
    }

    return { success: true, posted_at: now }
}
