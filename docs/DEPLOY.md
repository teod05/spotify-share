# Deployment Guide

This guide covers deploying the Spotify Share app to Render (free tier) with Supabase as the database.

## Architecture

- **Single web service**: Express serves the built Vite client and API on the same origin
- **Database**: Supabase PostgreSQL with pg_cron for scheduled drops
- **No in-process cron**: Render free tier sleeps after inactivity, making node-cron unreliable
- **Timezone handling**: All Berlin time logic works correctly regardless of server timezone (Render uses UTC)

## Render Setup

### 1. Create Web Service

1. Go to [render.com](https://render.com) and create a new Web Service
2. Connect your GitHub repository
3. Configure the service:
   - **Name**: `spotify-share` (or your preferred name)
   - **Environment**: `Node`
   - **Region**: Choose closest to your users
   - **Branch**: `master`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free

### 2. Environment Variables

Add these environment variables in the Render dashboard:

```
# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your-service-role-key

# Spotify API
CLIENT_ID=your-spotify-client-id
CLIENT_SECRET=your-spotify-client-secret
REDIRECT_URI=https://your-app.onrender.com/callback
SPOTIFY_PLAYLIST_ID=63wGlhpFDoQ8GXdRsySsNN

# App Config
NODE_ENV=production
PORT=10000
FRONTEND_URL=https://your-app.onrender.com

# Drop Secret (generate a long random string)
DROP_SECRET=generate-a-long-random-secure-string

# Cron (keep disabled on Render)
ENABLE_CRON=false
```

#### Getting Spotify Credentials

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create/select your app
3. Copy `Client ID` and `Client Secret`
4. Add redirect URI: `https://your-app.onrender.com/callback`
   - Go to app settings → Redirect URIs → Add
   - Save changes

#### Generating DROP_SECRET

```bash
# Generate a secure random string
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Deploy

1. Click "Create Web Service"
2. Wait for build and deployment (takes 2-3 minutes)
3. Your app will be available at `https://your-app.onrender.com`

## Supabase Cron Setup

Since Render free tier sleeps after inactivity, we use Supabase's `pg_cron` extension to trigger the Friday drop by calling the `/api/drop` endpoint.

### 1. Enable pg_cron Extension

Run this in Supabase SQL Editor:

\`\`\`sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;
\`\`\`

### 2. Create Drop Function

This function makes an HTTP POST to your `/api/drop` endpoint:

\`\`\`sql
-- Create function to trigger drop
CREATE OR REPLACE FUNCTION trigger_friday_drop()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    drop_response bigint;
    drop_secret text;
BEGIN
    -- Get DROP_SECRET from Supabase vault (safer than hardcoding)
    -- First, store your DROP_SECRET: 
    -- SELECT vault.create_secret('your-drop-secret-here', 'drop-secret');
    SELECT decrypted_secret INTO drop_secret 
    FROM vault.decrypted_secrets 
    WHERE name = 'drop-secret';

    -- Make POST request to drop endpoint
    SELECT net.http_post(
        url := 'https://your-app.onrender.com/api/drop',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || drop_secret
        ),
        body := '{}'::jsonb
    ) INTO drop_response;

    RAISE NOTICE 'Drop triggered, response ID: %', drop_response;
END;
$$;
\`\`\`

**Alternative without vault** (less secure, but simpler):

\`\`\`sql
CREATE OR REPLACE FUNCTION trigger_friday_drop()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    drop_response bigint;
BEGIN
    SELECT net.http_post(
        url := 'https://your-app.onrender.com/api/drop',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer your-drop-secret-here'
        ),
        body := '{}'::jsonb
    ) INTO drop_response;
END;
$$;
\`\`\`

### 3. Schedule Cron Jobs

Berlin uses CEST (UTC+2) in summer and CET (UTC+1) in winter. We need **two schedules**:

\`\`\`sql
-- Summer schedule (CEST = UTC+2): Fridays at 16:00 UTC = 18:00 Berlin
-- Active from last Sunday of March to last Sunday of October
SELECT cron.schedule(
    'friday-drop-summer',
    '0 16 * 3-10 5',  -- minute hour day month day-of-week
    $$SELECT trigger_friday_drop()$$
);

-- Winter schedule (CET = UTC+1): Fridays at 17:00 UTC = 18:00 Berlin  
-- Active from November to February
SELECT cron.schedule(
    'friday-drop-winter',
    '0 17 * 11-2 5',
    $$SELECT trigger_friday_drop()$$
);
\`\`\`

**Important**: This simplified approach runs both schedules year-round. One will fire at Berlin 17:00, the other at Berlin 18:00. The `/api/drop` endpoint is idempotent - if songs are already posted, it won't double-add them. Only the 18:00 Berlin run will find pending songs.

### 4. Keepalive Pings

Render free tier sleeps after 15 minutes of inactivity. To ensure the service is awake when the drop runs, we ping it before:

\`\`\`sql
-- Create ping function
CREATE OR REPLACE FUNCTION ping_app()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    ping_response bigint;
BEGIN
    SELECT net.http_get(
        url := 'https://your-app.onrender.com/'
    ) INTO ping_response;
END;
$$;

-- Summer keepalive: Every 5 minutes from 17:30-18:00 UTC on Fridays (Mar-Oct)
SELECT cron.schedule(
    'keepalive-summer',
    '30-59/5 15 * 3-10 5',  -- Every 5 min from 15:30-15:59 UTC
    $$SELECT ping_app()$$
);

SELECT cron.schedule(
    'keepalive-summer-2',
    '0-30/5 16 * 3-10 5',  -- Every 5 min from 16:00-16:30 UTC  
    $$SELECT ping_app()$$
);

-- Winter keepalive: Every 5 minutes from 16:30-17:30 UTC on Fridays (Nov-Feb)
SELECT cron.schedule(
    'keepalive-winter',
    '30-59/5 16 * 11-2 5',
    $$SELECT ping_app()$$
);

SELECT cron.schedule(
    'keepalive-winter-2',
    '0-30/5 17 * 11-2 5',
    $$SELECT ping_app()$$
);
\`\`\`

### 5. Verify Cron Jobs

\`\`\`sql
-- List all scheduled jobs
SELECT * FROM cron.job;

-- Check job execution history
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;

-- Manually test the drop function
SELECT trigger_friday_drop();
\`\`\`

### 6. Supabase Free Tier Keepalive

Supabase free tier projects pause after 7 days of inactivity. The weekly Friday drop (or any user activity) keeps it active. If the app is unused for a week:

- You'll get an email warning before pause
- Projects auto-resume on first query (may take 1-2 seconds)
- Consider setting a weekly keepalive query if needed:

\`\`\`sql
-- Optional: Weekly keepalive query (runs Mondays at 9 AM UTC)
SELECT cron.schedule(
    'supabase-keepalive',
    '0 9 * * 1',
    $$SELECT 1$$
);
\`\`\`

## Manual Drop Trigger

To manually trigger a drop (for testing or emergency):

\`\`\`bash
curl -X POST https://your-app.onrender.com/api/drop \\
  -H "Authorization: Bearer your-drop-secret" \\
  -H "Content-Type: application/json"
\`\`\`

Response:
\`\`\`json
{
  "success": true,
  "message": "Drop completed",
  "total": 2,
  "added": 2,
  "failed": 0
}
\`\`\`

## Troubleshooting

### Render Service Not Responding

1. Check Render logs for errors
2. Verify all environment variables are set
3. Ensure build completed successfully

### Drop Not Running

1. Check Supabase cron job history: `SELECT * FROM cron.job_run_details`
2. Test manually: `SELECT trigger_friday_drop()`
3. Verify DROP_SECRET matches in both Supabase and Render
4. Check Render logs at drop time

### Timezone Issues

All Berlin time calculations use `date-fns-tz` and work correctly regardless of server timezone. Test with:

\`\`\`bash
# Run tests
cd server && node utils/time.test.js
\`\`\`

### Spotify OAuth Issues

1. Verify redirect URI exactly matches in Spotify dashboard
2. Check `REDIRECT_URI` env var on Render
3. Ensure cookies are working (check browser dev tools)

## Production Checklist

- [ ] All environment variables set on Render
- [ ] Spotify redirect URI added to dashboard  
- [ ] `pg_cron` and `pg_net` extensions enabled
- [ ] Drop function created with correct URL and secret
- [ ] Cron jobs scheduled (summer & winter)
- [ ] Keepalive pings configured
- [ ] Manual drop test successful
- [ ] First Friday drop verified
