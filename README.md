# Spotify Share

A weekly music sharing app for two people. Each week, both users pick one song and explain why they chose it. On Friday at 18:00 (Berlin time), the songs are automatically added to a shared Spotify playlist.

## Tech Stack

- **Frontend**: React 19 + Vite
- **Backend**: Express 5 + Node.js
- **Database**: Supabase (PostgreSQL)
- **Cron**: node-cron for scheduled drops
- **OAuth**: Spotify Web API

## Setup

### Prerequisites

- Node.js 18+
- Supabase account
- Spotify Developer account

### 1. Install Dependencies

```bash
npm install
cd client && npm install && cd ..
```

### 2. Set Up Spotify App

1. Go to https://developer.spotify.com/dashboard
2. Create a new app
3. Add redirect URI: `http://127.0.0.1:8888/callback`
4. Copy Client ID and Client Secret
5. Requested scopes: `playlist-modify-public playlist-modify-private`

### 3. Set Up Supabase

1. Create a Supabase project
2. Run the schema migrations (users, songs, playlist tables)
3. Create two users via Supabase Auth
4. Link users in the `users` table with `auth_id` from Supabase Auth

### 4. Create Collaborative Spotify Playlist

1. Create a new playlist in Spotify
2. Make it collaborative (Edit > Collaborative Playlist)
3. Copy the playlist ID from the URL (e.g., `3EssRQQTtRgom8M2ggURRr` from `https://open.spotify.com/playlist/3EssRQQTtRgom8M2ggURRr`)

### 5. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your-service-role-key

# Spotify OAuth
CLIENT_ID=your-spotify-client-id
CLIENT_SECRET=your-spotify-client-secret
REDIRECT_URI=http://127.0.0.1:8888/callback

# Frontend
FRONTEND_URL=http://127.0.0.1:5173

# Spotify Playlist
SPOTIFY_PLAYLIST_ID=your-playlist-id

# Environment
NODE_ENV=development
```

See `server/.env.example` for all variables.

### 6. Run the Application

**Backend (terminal 1):**
```bash
npm run dev
# or
node --env-file=.env server/index.js
```

**Frontend (terminal 2):**
```bash
cd client
npm run dev
```

### 7. Access the App

⚠️ **Important**: Open the app at http://127.0.0.1:5173 (not `localhost`)

This is required for Spotify OAuth to work correctly. Spotify redirects to `127.0.0.1:8888/callback`, and cookies need to match the domain.

## How It Works

1. **Login**: Both users sign in with their Supabase credentials
2. **Connect Spotify**: Each user connects their own Spotify account (OAuth)
3. **Pick a Song**: Each week, add one Spotify track and explain why you chose it
4. **Friday Drop**: At 18:00 Berlin time, songs are added to the shared playlist
   - Each song is added using that user's Spotify token
   - Shows as "added by" the correct user in Spotify
5. **History**: View all past weekly picks

## Database Schema

- **users**: User accounts with Spotify refresh tokens
- **songs**: Song picks with `posted_at` null until Friday drop
- **playlist**: Shared playlist info (optional, falls back to env var)

## Testing

Run unit tests:
```bash
node server/utils/spotify.test.js
node server/utils/time.test.js
```

Build and lint:
```bash
cd client
npm run build
npm run lint
```

## Friday Drop Job

The cron job runs at `0 18 * * 5` (Friday 18:00 Europe/Berlin).

For each pending song:
1. Use the song owner's refresh token to get an access token
2. Add the track to the playlist (shows as added by that user)
3. Mark the song as `posted_at = now()`
4. If a user hasn't connected Spotify, their song is skipped and left pending

Manual trigger (for testing):
```javascript
import { runDrop } from './server/jobs/friday-drop.js'
await runDrop()
```

## License

Private project for personal use.
