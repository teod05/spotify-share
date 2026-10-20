import crypto from "node:crypto"
import express from "express"
import { supabase } from "../db.js";
import { requireAuth } from "./auth.js";
import { parseSpotifyTrackLink, normalizeSpotifyTrackLink, getTrackMetadata, addSongToPlaylist } from "../utils/spotify.js";
import { getNextFridayDrop, getPreviousFridayDrop, isInGraceWindow } from "../utils/time.js";
import { runDrop } from "../jobs/friday-drop.js";

const client_id = process.env.CLIENT_ID
const client_secret = process.env.CLIENT_SECRET
const redirect_uri = process.env.REDIRECT_URI || 'http://127.0.0.1:8888/callback'
const drop_secret = process.env.DROP_SECRET

const router = express.Router()

function getFrontendUrl(req) {
    if (process.env.FRONTEND_URL) {
        return process.env.FRONTEND_URL
    }
    const protocol = req.get('x-forwarded-proto') || req.protocol
    const host = req.get('host')
    return `${protocol}://${host}`
}

router.get('/spotify-login', requireAuth, function(req, res) {
    const state = crypto.randomUUID()
    const scope = 'user-read-private user-read-email playlist-modify-public playlist-modify-private'

    res.cookie('spotify_auth_state', state, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 5 * 60 * 1000
    })

    const params = new URLSearchParams({
        response_type: 'code',
        client_id,
        scope,
        redirect_uri,
        state,
    })
    res.redirect('https://accounts.spotify.com/authorize?' + params)
})

router.get("/callback", async (req, res) => {
    const { code, state, error } = req.query
    const storedState = req.cookies.spotify_auth_state
    const token = req.cookies.access_token
    const frontendUrl = getFrontendUrl(req)

    if (error) {
        return res.redirect(`${frontendUrl}/?spotify=error&reason=${encodeURIComponent(error)}`)
    }

    if (!token) {
        return res.redirect(`${frontendUrl}/?spotify=error&reason=not_authenticated`)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
        return res.redirect(`${frontendUrl}/?spotify=error&reason=invalid_session`)
    }

    if (!code) {
        return res.redirect(`${frontendUrl}/?spotify=error&reason=missing_code`)
    }

    if (state !== storedState) {
        return res.redirect(`${frontendUrl}/?spotify=error&reason=state_mismatch`)
    }

    res.clearCookie('spotify_auth_state')

    try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: "POST",
            headers: {
                Authorization: 'Basic ' + Buffer.from(client_id + ":" + client_secret).toString("base64"),
                "Content-type": 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                code: code,
                redirect_uri: redirect_uri
            })
        })

        const data = await response.json()
        if (!response.ok) {
            return res.redirect(`${frontendUrl}/?spotify=error&reason=${encodeURIComponent(data.error || 'token_exchange_failed')}`)
        }

        const { error: updateError } = await supabase
            .from('users')
            .update({ refresh_token: data.refresh_token })
            .eq('auth_id', user.id)

        if (updateError) {
            throw updateError
        }

        res.redirect(`${frontendUrl}/?spotify=connected`)
    } catch (err) {
        console.error('Callback error:', err)
        return res.redirect(`${frontendUrl}/?spotify=error&reason=save_failed`)
    }
})

router.get("/api/week", requireAuth, async (req, res) => {
    try {
        const { data: currentUser, error: userError } = await supabase
            .from('users')
            .select('id, playlist_id')
            .eq('auth_id', req.user.id)
            .single()

        if (userError) {
            throw userError
        }

        const { data: allUsers, error: usersError } = await supabase
            .from('users')
            .select('id')

        if (usersError) {
            throw usersError
        }

        const otherUserId = allUsers.find(u => u.id !== currentUser.id)?.id

        const { data: yourPick } = await supabase
            .from('songs')
            .select('*')
            .eq('user_id', currentUser.id)
            .is('posted_at', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        const { data: theirPick } = await supabase
            .from('songs')
            .select('created_at')
            .eq('user_id', otherUserId)
            .is('posted_at', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        let yourPickWithMetadata = null
        if (yourPick) {
            const metadata = await getTrackMetadata(yourPick.song_link)
            yourPickWithMetadata = {
                id: yourPick.id,
                song_link: yourPick.song_link,
                description: yourPick.description,
                created_at: yourPick.created_at,
                title: metadata?.title || 'Unknown Track',
                thumbnail_url: metadata?.thumbnail_url || null
            }
        }

        const dropAt = getNextFridayDrop().toISOString()
        const now = new Date()
        const inGraceWindow = isInGraceWindow(now)
        
        let canAddLatePick = false
        let previousWeekDrop = null

        if (inGraceWindow) {
            const prevDrop = getPreviousFridayDrop(now)
            previousWeekDrop = prevDrop.toISOString()
            
            const { data: prevWeekPick } = await supabase
                .from('songs')
                .select('id')
                .eq('user_id', currentUser.id)
                .not('posted_at', 'is', null)
                .gte('posted_at', prevDrop.toISOString())
                .maybeSingle()

            canAddLatePick = !prevWeekPick
        }

        let playlistId = process.env.SPOTIFY_PLAYLIST_ID

        if (currentUser.playlist_id) {
            const { data: playlist, error: playlistError } = await supabase
                .from('playlist')
                .select('playlist_link')
                .eq('playlist_id', currentUser.playlist_id)
                .maybeSingle()

            if (!playlistError && playlist?.playlist_link) {
                const match = playlist.playlist_link.match(/playlist\/([a-zA-Z0-9]+)/)
                if (match) {
                    playlistId = match[1]
                }
            }
        }

        res.json({
            you: yourPickWithMetadata,
            them: {
                submitted: !!theirPick,
                created_at: theirPick?.created_at || null
            },
            dropAt,
            playlistId,
            graceWindow: inGraceWindow ? {
                active: true,
                canAddLatePick,
                previousWeekDrop
            } : null
        })
    } catch (err) {
        console.error("Error fetching week data:", err)
        res.status(500).json({ message: err.message })
    }
})

router.post("/api/picks", requireAuth, async (req, res) => {
    try {
        const { song_link, description } = req.body

        if (!song_link || !description) {
            return res.status(400).json({ message: "song_link and description are required" })
        }

        const trackId = parseSpotifyTrackLink(song_link)
        if (!trackId) {
            return res.status(400).json({ message: "Invalid Spotify track link. Please use a valid open.spotify.com/track/ URL or spotify:track: URI" })
        }

        if (description.length > 280) {
            return res.status(400).json({ message: "Description must be 280 characters or less" })
        }

        const normalizedLink = normalizeSpotifyTrackLink(song_link)

        const { data: currentUser, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('auth_id', req.user.id)
            .single()

        if (userError) {
            throw userError
        }

        const { data: existingPick } = await supabase
            .from('songs')
            .select('id')
            .eq('user_id', currentUser.id)
            .is('posted_at', null)
            .maybeSingle()

        if (existingPick) {
            const { error: updateError } = await supabase
                .from('songs')
                .update({
                    song_link: normalizedLink,
                    description: description
                })
                .eq('id', existingPick.id)

            if (updateError) {
                throw updateError
            }
            
            res.status(200).json({ ok: true })
        } else {
            const { data: newSong, error: insertError } = await supabase
                .from('songs')
                .insert({
                    song_link: normalizedLink,
                    description: description,
                    user_id: currentUser.id
                })
                .select('id, created_at')
                .single()

            if (insertError) {
                throw insertError
            }

            const now = new Date()
            const isGrace = isInGraceWindow(now)
            
            if (isGrace) {
                const prevDrop = getPreviousFridayDrop(now)
                
                const { data: prevWeekPick } = await supabase
                    .from('songs')
                    .select('id')
                    .eq('user_id', currentUser.id)
                    .not('posted_at', 'is', null)
                    .gte('posted_at', prevDrop.toISOString())
                    .maybeSingle()

                if (!prevWeekPick) {
                    try {
                        await addSongToPlaylist(newSong.id, normalizedLink, currentUser.id)
                        console.log(`[Late Pick] Added song ${newSong.id} for user ${currentUser.id}`)
                    } catch (error) {
                        console.error(`[Late Pick] Failed to add song ${newSong.id}:`, error.message)
                    }
                }
            }

            res.status(200).json({ ok: true })
        }
    } catch (err) {
        console.error("Error saving pick:", err)
        res.status(500).json({ message: err.message || 'Internal Server Error' })
    }
})

router.get("/api/history", requireAuth, async (req, res) => {
    try {
        const { data: songs, error } = await supabase
            .from('songs')
            .select(`
                id,
                song_link,
                description,
                posted_at,
                created_at,
                user_id,
                users (
                    name
                )
            `)
            .not('posted_at', 'is', null)
            .order('posted_at', { ascending: false })

        if (error) {
            throw error
        }

        const songsWithMetadata = await Promise.all(
            songs.map(async (song) => {
                const metadata = await getTrackMetadata(song.song_link)
                
                const postedDate = new Date(song.posted_at)
                const prevDrop = getPreviousFridayDrop(postedDate)
                const createdDate = new Date(song.created_at)
                
                const isLate = createdDate > prevDrop
                
                return {
                    id: song.id,
                    song_link: song.song_link,
                    description: song.description,
                    posted_at: song.posted_at,
                    created_at: song.created_at,
                    user_name: song.users?.name || 'Unknown',
                    title: metadata?.title || 'Unknown Track',
                    thumbnail_url: metadata?.thumbnail_url || null,
                    is_late: isLate
                }
            })
        )

        res.json(songsWithMetadata)
    } catch (err) {
        console.error("Error fetching history:", err)
        res.status(500).json({ message: err.message })
    }
})

router.post("/api/drop", async (req, res) => {
    const authHeader = req.headers.authorization
    
    if (!drop_secret) {
        return res.status(503).json({ 
            error: 'DROP_SECRET not configured',
            message: 'The drop endpoint is not available without DROP_SECRET' 
        })
    }
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid authorization header' })
    }
    
    const token = authHeader.substring(7)
    if (token !== drop_secret) {
        return res.status(403).json({ error: 'Invalid authorization token' })
    }
    
    try {
        console.log('[Manual Drop] Starting drop via API...')
        const result = await runDrop()
        
        res.json({
            success: true,
            message: 'Drop completed',
            ...result
        })
    } catch (err) {
        console.error('[Manual Drop] Error:', err)
        res.status(500).json({ 
            success: false,
            error: err.message 
        })
    }
})

export default router
