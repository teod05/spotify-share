import cookieParser from "cookie-parser";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cron from "node-cron";
import spotifyRoutes from './routes/spotify.js';
import authRoutes from './routes/auth.js';
import { runDrop } from './jobs/friday-drop.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = process.env.PORT || 8888
const isProduction = process.env.NODE_ENV === 'production'
const app = express();

if (isProduction) {
    app.set('trust proxy', 1)
}

app.use(express.json())
app.use(cookieParser())

app.use('/', spotifyRoutes)
app.use('/api', authRoutes)

if (process.env.ENABLE_CRON === 'true') {
    cron.schedule('0 18 * * 5', () => {
        console.log('Running Friday drop job...')
        runDrop()
    }, {
        timezone: 'Europe/Berlin'
    })
    console.log('Cron job scheduled for Friday 18:00 Europe/Berlin')
}

if (isProduction) {
    const clientDistPath = path.join(__dirname, '../client/dist')
    
    app.use(express.static(clientDistPath))
    
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api') && !req.path.startsWith('/spotify-login') && !req.path.startsWith('/callback')) {
            res.sendFile(path.join(clientDistPath, 'index.html'))
        }
    })
}

app.listen(port, () => {
    console.log(`Server listening on port ${port}`)
    console.log(`Environment: ${isProduction ? 'production' : 'development'}`)
})
