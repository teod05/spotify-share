import crypto from "node:crypto"
import express from "express"

const client_id = process.env.CLIENT_ID
const client_secret = process.env.CLIENT_SECRET
const redirect_uri = 'http://127.0.0.1:8888/callback';
// mini express app middleware to attach routes to and then plug them on your main Express app
const router = express.Router()

router.get('/login', function(req, res) {

  const state = crypto.randomUUID();
  const scope = 'user-read-private user-read-email playlist-modify-public playlist-modify-private';

  // building URL search parameters and adds them to the end of url authorization
  const params = new URLSearchParams({
    response_type: 'code',
    client_id,
    scope,
    redirect_uri,
    state,
  })
  res.redirect('https://accounts.spotify.com/authorize?' + params)
});

// the callback that spotify uses (we request the access token)
router.get("/callback", async (req,res) => {
   const {code, state, error} = req.query

   if(error){
    return res.status(400).send(`Spotify's authorization failed ${error}`)
   }

   if(!code){
    return res.status(400).send("Missing authorization code")
   }
   // requesting acess token
   const response = await fetch('https://accounts.spotify.com/api/token', {
    method : "POST",
    headers: {
      //Authorization	Required	Base 64 encoded string that contains the client ID and client secret key. The field must have the format: Authorization: Basic <base64 encoded client_id:client_secret>
      //Content-Type	Required	Set to application/x-www-form-urlencoded.
      Authorization : 'Basic ' + Buffer.from(client_id + ":" + client_secret).toString("base64") ,
      "Content-type" : 'application/x-www-form-urlencoded'
    },
    body : new URLSearchParams({
      //grant_type	Required	This field must contain the value "authorization_code".
      //code	Required	The authorization code returned from the previous request.
      //redirect_uri	Required	This parameter is used for validation only (there is no actual redirection). 
      // The value of this parameter must exactly match the value of redirect_uri supplied when requesting the authorization code.
      grant_type : "authorization_code",
      code : code,
      redirect_uri : redirect_uri
    }) 
    
   })
   // sending the data back to the client
  const data = await response.json()
  if (!response.ok){
    res.status(400).send(`${data.error}: ${data.error_description}`)
  }

  // logic here is only for one user. Since we dont have app defined here the only way
  // we can access it is from req.app and we set a app.locals to store our acess token, 
  // and since its the same app while the program runs the acess token lives
  req.app.locals.accessToken = data.access_token
  res.redirect("http://localhost:5173")
})  

router.post("/api/add", async function(req, res) {

    // check if the accessToken is here
    if(!req.app.locals.accessToken){
        return res.status(401).json({message : "Not logged in (Missing Access Token)"})
    }

    //calls addToplaylist passing the access token and manipulates the string link to get the id
    try{
        await addToPlaylist(req.app.locals.accessToken, req.body.link.substring(31,53))
        res.status(200).json({ok : true})

    } catch(err){
        res.status(500).json({message: err.message || 'Internal Server Error'})
    }
})

async function addToPlaylist(accessToken, spotifyId) {
    const url = `https://api.spotify.com/v1/playlists/3EssRQQTtRgom8M2ggURRr/items`
    
        const res = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                uris : [`spotify:track:${spotifyId}`]
            })
        })
        if(!res.ok){
            const raw = await res.text()
            throw new Error(`${res.status}: ${raw}`)
        }

        const result = await res.json()

}

export default router