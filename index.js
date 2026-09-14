import express from "express";
import { URLSearchParams } from "url"
import crypto from "node:crypto"


const redirect_uri = 'http://127.0.0.1:8888/callback';
const client_id = process.env.CLIENT_ID
const port = 8888
const app = express();

console.log(client_id)

app.get('/login', function(req, res) {

  const state = crypto.randomUUID();
  const scope = 'user-read-private user-read-email playlist-modify-public';

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

// IMPLEMENT /CALLBACK
app.listen(port, () => {
    console.log(`listening on port ${port}`)
})

// const res = await fetch("https://accounts.spotify.com/api/token", {
//   method: "POST",
//   body: new URLSearchParams({
//     grant_type: "client_credentials",
//     client_id: process.env.CLIENT_ID,
//     client_secret: process.env.CLIENT_SECRET,
//   }),
// });

// const data = await res.json();

// async function getArtist(){
//     const url = "https://api.spotify.com/v1/artists/3TVXtAsR1Inumwj472S9r4"

//     try{
//         const response_artist = await fetch(url, {
//             method: "GET",
//             headers: {
//                 Authorization: `Bearer ${data.access_token}`
//             }
//         })
//         if (!response_artist.ok){
//             throw new Error(`Response status: ${response_artist.status}`)
//         }

//         const result = await response_artist.json();
//         console.log(result)
//     } catch(error){
//         console.error(error.message)
//     }

// }

// async function addToPlaylist() {
//     const url = "https://api.spotify.com/v1/playlists/3iSbxQnttxZvLr9Kyrc7ha/items"
    
//     try{
//         const res = await fetch(url, {
//             method: "POST",
//             headers: {
//                 Authorization: `Bearer ${data.access_token}`,
//                 "Content-Type": "application/json"
//             },
//             body: JSON.stringify({
//                 uris : ["spotify:track:6bUNEbXT7HovLW6BgPCBsb"]
//             })
//         })
//         if(!res.ok){
//             throw new Error(`Response status: ${res.status}`)
//         }

//         const result = await res.json()
//         console.log(result)
//     } catch(error){
//         console.error(error.message)
//     }
// }

// await addToPlaylist()