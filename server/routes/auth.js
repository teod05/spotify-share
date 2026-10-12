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

        console.log("data", data)

        res.status(200).json({ok: true})
    } catch(err){
        console.log("error:", err.message)
        res.status(401).json({message: err.message})
    }
})

export default router