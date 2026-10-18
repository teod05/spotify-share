import express from "express"
import { supabase } from "../db.js";

const router = express.Router()

router.post("/login", async (req, res) => {
    const credentials = req.body

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password
        })
        
        if (error) {
            throw new Error(error.message)
        }

        res.cookie("access_token", data.session.access_token, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === 'production',
            maxAge: data.session.expires_in * 1000
        })

        res.status(200).json({ ok: true })
    } catch (err) {
        console.log("error:", err.message)
        res.status(401).json({ message: err.message })
    }
})

router.post("/logout", (req, res) => {
    res.clearCookie("access_token")
    res.status(200).json({ ok: true })
})

router.get("/me", requireAuth, async (req, res) => {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('id, name, email, created_at')
            .eq('auth_id', req.user.id)
            .single()
        
        if (error) {
            throw error
        }

        const { data: userWithToken } = await supabase
            .from('users')
            .select('refresh_token')
            .eq('auth_id', req.user.id)
            .single()

        res.json({
            ...user,
            spotifyConnected: !!userWithToken?.refresh_token
        })
    } catch (err) {
        console.log("error:", err.message)
        res.status(500).json({ message: err.message })
    }
})

export async function requireAuth(req, res, next) {
    const token = req.cookies.access_token
    if (!token) {
        return res.status(401).json({ message: "Not signed in" })
    }
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) {
        return res.status(401).json({ message: "Invalid Session" })
    }

    req.user = user
    next()
}

export default router
