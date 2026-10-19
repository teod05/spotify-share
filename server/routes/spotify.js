import crypto from "node:crypto"
import express from "express"
import { supabase } from "../db.js";
import { requireAuth } from "./auth.js";
import { parseSpotifyTrackLink, normalizeSpotifyTrackLink, getTrackMetadata } from "../utils/spotify.js";
import { getNextFridayDrop } from "../utils/time.js";

const client_id = process.env.CLIENT_ID
const client_secret = process.env.CLIENT_SECRET
const redirect_uri = process.env.REDIRECT_URI || 'http://127.0.0.1:8888/callback'
const frontend_url = process.env.FRONTEND_URL || 'http://127.0.0.1:5173'

const router = express.Router()

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

    if (error) {
        return res.redirect(`${frontend_url}/?spotify=error&reason=${encodeURIComponent(error)}`)
    }

    if (!token) {
        return res.redirect(`${frontend_url}/?spotify=error&reason=not_authenticated`)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
        return res.redirect(`${frontend_url}/?spotify=error&reason=invalid_session`)
    }

    if (!code) {
        return res.redirect(`${frontend_url}/?spotify=error&reason=missing_code`)
    }

    if (state !== storedState) {
        return res.redirect(`${frontend_url}/?spotify=error&reason=state_mismatch`)
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
            return res.redirect(`${frontend_url}/?spotify=error&reason=${encodeURIComponent(data.error || 'token_exchange_failed')}`)
        }

        const { error: updateError } = await supabase
            .from('users')
            .update({ refresh_token: data.refresh_token })
            .eq('auth_id', user.id)

        if (updateError) {
            throw updateError
        }

        res.redirect(`${frontend_url}/?spotify=connected`)
    } catch (err) {
        console.error('Callback error:', err)
        return res.redirect(`${frontend_url}/?spotify=error&reason=save_failed`)
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
            playlistId
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
        } else {
            const { error: insertError } = await supabase
                .from('songs')
                .insert({
                    song_link: normalizedLink,
                    description: description,
                    user_id: currentUser.id
                })

            if (insertError) {
                throw insertError
            }
        }

        res.status(200).json({ ok: true })
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
                return {
                    id: song.id,
                    song_link: song.song_link,
                    description: song.description,
                    posted_at: song.posted_at,
                    user_name: song.users?.name || 'Unknown',
                    title: metadata?.title || 'Unknown Track',
                    thumbnail_url: metadata?.thumbnail_url || null
                }
            })
        )

        res.json(songsWithMetadata)
    } catch (err) {
        console.error("Error fetching history:", err)
        res.status(500).json({ message: err.message })
    }
})

export default router
