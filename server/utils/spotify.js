import { supabase } from "../db.js";

const client_id = process.env.CLIENT_ID
const client_secret = process.env.CLIENT_SECRET

export function parseSpotifyTrackLink(link) {
    if (!link || typeof link !== 'string') {
        return null
    }

    const trimmed = link.trim()
    
    // Handle spotify:track:ID format
    const uriMatch = trimmed.match(/^spotify:track:([a-zA-Z0-9]+)$/)
    if (uriMatch) {
        return uriMatch[1]
    }
    
    // Handle https://open.spotify.com/track/ID format (strip query params)
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
