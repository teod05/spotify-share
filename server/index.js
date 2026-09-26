import express, { response } from "express";
import spotifyRoutes from './routes/spotify.js';
const port = 8888
const app = express();


//refresh token logic and helper to see if its valid
app.use(express.json())

//figure out these
app.use('/', spotifyRoutes)



app.listen(port, () => {
    console.log(`listening on port ${port}`)
})

