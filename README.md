# Spotify Share

With Spotify Share, two people can swap one song a week and say why they picked it. Your partner's pick stays hidden until Friday at 18:00 Berlin time. Then both songs appear in your shared Spotify playlist, each one "added by" the person who chose it.

Spotify Share is a personal project for two users. It is not a multi-user service.

## Features

- **One pick a week.** Paste a Spotify track link and write up to 280 characters about why you chose it. You can change your pick until the drop.
- **Hidden until Friday.** You see that your partner has picked, but not what, until the Friday drop.
- **Friday drop.** At 18:00 Berlin time, both picks are added to the shared playlist. Each song is added with its owner's Spotify account, so Spotify shows the right "added by" name.
- **Late picks.** Missed Friday? Until Sunday 23:59 Berlin time, you can still add a pick for the previous week. It goes into the playlist right away.
- **History.** Browse every past week and see which picks were late.

## Get started locally

This section takes you from a fresh clone to a running app on your computer. Plan for about 30 minutes, most of it spent in the Spotify and Supabase dashboards.

### Prerequisites

- Node.js 18 or later
- A [Supabase](https://supabase.com) project
- A [Spotify for Developers](https://developer.spotify.com/dashboard) app
- A Spotify playlist that both users can add to

### 1. Install dependencies

```bash
npm install
cd client && npm install && cd ..
```

### 2. Set up the Spotify app

1. Open the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and create an app.
2. Add this redirect URI: `http://127.0.0.1:8888/callback`
3. Copy the **Client ID** and **Client secret**.

The app requests these scopes when a user connects Spotify: `user-read-private`, `user-read-email`, `playlist-modify-public` and `playlist-modify-private`.

### 3. Set up Supabase

Create these tables in your Supabase project. The repo does not include migration files yet, so create them in the Supabase table editor or SQL editor.

| Table | Columns the app uses |
| --- | --- |
| `users` | `id`, `auth_id` (Supabase Auth user ID), `name`, `email`, `refresh_token`, `playlist_id`, `created_at` |
| `songs` | `id`, `user_id`, `song_link`, `description`, `created_at`, `posted_at` (null until the song is added to the playlist) |
| `playlist` | `playlist_id`, `playlist_link` (optional; overrides `SPOTIFY_PLAYLIST_ID`) |

Then create the two users in Supabase Auth and add a matching row for each in `users`, with `auth_id` set to their Auth user ID.

### 4. Configure environment variables

Copy the example file and fill in your values:

```bash
cp server/.env.example server/.env
```

| Variable | Description |
| --- | --- |
| `SUPABASE_URL` | Your Supabase project URL. |
| `SUPABASE_SECRET_KEY` | Your Supabase service role key. Keep it secret. |
| `CLIENT_ID`, `CLIENT_SECRET` | From your Spotify app. |
| `REDIRECT_URI` | `http://127.0.0.1:8888/callback` for local use. |
| `FRONTEND_URL` | `http://127.0.0.1:5173` for local use. |
| `SPOTIFY_PLAYLIST_ID` | The ID at the end of your playlist URL, for example `3EssRQQTtRgom8M2ggURRr` in `https://open.spotify.com/playlist/3EssRQQTtRgom8M2ggURRr`. |
| `NODE_ENV` | `development` for local use. |
| `DROP_SECRET` | Optional locally. Protects the drop endpoint in production. |
| `ENABLE_CRON` | Set to `true` to run the Friday drop inside the server process. Leave it unset on hosts that sleep. |

### 5. Run the app

Start the server and the client in two terminals:

```bash
npm run dev:server
```

```bash
npm run dev:client
```

### 6. Try it out

1. Open http://127.0.0.1:5173. Use `127.0.0.1`, not `localhost`, so the Spotify login cookies match the redirect URI.
2. Sign in with one of your Supabase users.
3. Select **Connect Spotify** and approve access.
4. Paste a Spotify track link, write why you picked it and select **Save pick**.

You should now see your pick for this week, and a note about whether your partner has picked yet.

## Run the tests

```bash
node server/utils/time.test.js
node server/utils/drop-guard.test.js
node --env-file=server/.env server/utils/spotify.test.js
```

The Spotify test needs the env file because it loads the Supabase client.

## Documentation

- [Deployment guide](docs/DEPLOY.md) explains how to host the app on Render's free tier and trigger the Friday drop from Supabase `pg_cron`, because the free server sleeps and cannot keep its own schedule. It also covers wake-up pings, the drop endpoint (`POST /api/drop`) and troubleshooting.

## Project structure

```text
client/   React front end (Vite)
server/   Express API, Spotify OAuth and the Friday drop job
docs/     Deployment and other guides
```

## Contributing and contact

This is a private project for two people, so outside contributions are not expected. If you find a bug or have a question, open an issue on GitHub.

## License

No license has been chosen yet, so all rights are reserved.
