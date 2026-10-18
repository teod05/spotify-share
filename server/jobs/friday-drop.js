import { supabase } from "../db.js";

const client_id = process.env.CLIENT_ID
const client_secret = process.env.CLIENT_SECRET

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

export async function runDrop() {
    console.log('[Friday Drop] Starting drop job...')
    
    try {
        const { data: pendingSongs, error: songsError } = await supabase
            .from('songs')
            .select(`
                id,
                song_link,
                user_id,
                users (
                    id,
                    name,
                    refresh_token,
                    playlist_id
                )
            `)
            .is('posted_at', null)

        if (songsError) {
            throw songsError
        }

        if (!pendingSongs || pendingSongs.length === 0) {
            console.log('[Friday Drop] No pending songs to add')
            return
        }

        const successfullyAdded = []
        const now = new Date().toISOString()

        for (const song of pendingSongs) {
            try {
                const user = song.users

                if (!user.refresh_token) {
                    console.log(`[Friday Drop] Skipping song ${song.id} - user ${user.name} has no Spotify connection`)
                    continue
                }

                const accessToken = await refreshAccessToken(user.refresh_token)

                let playlistId = process.env.SPOTIFY_PLAYLIST_ID

                if (user.playlist_id) {
                    const { data: playlist, error: playlistError } = await supabase
                        .from('playlist')
                        .select('playlist_link')
                        .eq('playlist_id', user.playlist_id)
                        .single()

                    if (!playlistError && playlist?.playlist_link) {
                        const match = playlist.playlist_link.match(/playlist\/([a-zA-Z0-9]+)/)
                        if (match) {
                            playlistId = match[1]
                        }
                    }
                }

                if (!playlistId) {
                    console.log(`[Friday Drop] No playlist ID for song ${song.id}`)
                    continue
                }

                const match = song.song_link.match(/track\/([a-zA-Z0-9]+)/)
                if (!match) {
                    console.log(`[Friday Drop] Invalid track link for song ${song.id}`)
                    continue
                }

                const trackUri = `spotify:track:${match[1]}`

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
                    console.error(`[Friday Drop] Failed to add song ${song.id} to playlist: ${error}`)
                    continue
                }

                successfullyAdded.push(song.id)
                console.log(`[Friday Drop] Successfully added song ${song.id} by ${user.name}`)
            } catch (error) {
                console.error(`[Friday Drop] Error processing song ${song.id}:`, error)
            }
        }

        if (successfullyAdded.length > 0) {
            const { error: updateError } = await supabase
                .from('songs')
                .update({ posted_at: now })
                .in('id', successfullyAdded)

            if (updateError) {
                console.error('[Friday Drop] Error updating posted_at:', updateError)
            } else {
                console.log(`[Friday Drop] Marked ${successfullyAdded.length} songs as posted`)
            }
        }

        console.log(`[Friday Drop] Completed: ${successfullyAdded.length} of ${pendingSongs.length} songs added successfully`)
    } catch (error) {
        console.error('[Friday Drop] Error:', error)
    }
}
