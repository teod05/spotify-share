import cookieParser from "cookie-parser";
import express from "express";
import cron from "node-cron";
import spotifyRoutes from './routes/spotify.js';
import authRoutes from './routes/auth.js';
import { runDrop } from './jobs/friday-drop.js';

const port = 8888
const app = express();

app.use(express.json())
app.use(cookieParser())

app.use('/', spotifyRoutes)
app.use('/api', authRoutes)

cron.schedule('0 18 * * 5', () => {
    console.log('Running Friday drop job...')
    runDrop()
}, {
    timezone: 'Europe/Berlin'
})

app.listen(port, () => {
    console.log(`listening on port ${port}`)
})
