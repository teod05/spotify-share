import express from "express"
import { supabase } from "../db.js";

const router = express.Router()

router.post("/login", async (req, res) => {

    const credentials = await req.body

    try{
     const {data, error} = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
    })
        if(error){
            throw new Error(error.message)
        }

        res.cookie("access_token", data.session.access_token, [ {
            httpOnly: true,
            sameSite: "lax",
            secure: false, //https for prod
            maxAge: data.session.access_token.expires_in * 1000 //express expects ms not s (supabaase gives s)
        
        }])

        res.status(200).json({ok: true})
    } catch(err){
        console.log("error:", err.message)
        res.status(401).json({message: err.message})
    }
})

export async function requireAuth(req, res, next){
    const token = req.cookies.access_token
    if(!token){
        return res.status(401).json({message: "Not signed in"})
    }
    const { data : { user }, error } = await supabase.auth.getUser(token)
    if (error || !user){
        return res.status(401).json({message: "Ivalid Session"})
    }

    req.user = user
    next()
}

export default router