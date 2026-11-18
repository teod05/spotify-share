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

// Render ends HTTPS at its proxy and forwards plain HTTP to us. Without this,
// Express thinks every request is insecure and drops our `secure` cookies.
if (isProduction) {
    app.set('trust proxy', 1)
}

app.use(express.json())
app.use(cookieParser())

app.use('/', spotifyRoutes)
app.use('/api', authRoutes)

// The in-process schedule is off by default. Render's free tier puts the server
// to sleep when nobody uses it, so a timer here would miss the drop. In
// production, Supabase pg_cron calls POST /api/drop instead (see docs/DEPLOY.md).
// Only turn this on for a host that never sleeps.
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
    
    // The React app handles its own routes, so any unknown GET gets index.html.
    // The API and the Spotify OAuth routes must reach Express, so they are skipped.
    app.use((req, res, next) => {
        if (req.method === 'GET' && 
            !req.path.startsWith('/api') && 
            !req.path.startsWith('/spotify-login') && 
            !req.path.startsWith('/callback')) {
            res.sendFile(path.join(clientDistPath, 'index.html'))
        } else {
            next()
        }
    })
}

app.listen(port, () => {
    console.log(`Server listening on port ${port}`)
    console.log(`Environment: ${isProduction ? 'production' : 'development'}`)
})
