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

This function makes an HTTP POST to your `/api/drop` endpoint. The endpoint has a time guard that only runs the drop on Friday 18:00-18:59 Berlin time.

**Important**: `pg_net` is fire-and-forget. It queues the request and returns immediately. Check `net._http_response` table for actual results.

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

    -- Make POST request with long timeout for Render cold start (30-60s)
    SELECT net.http_post(
        url := 'https://your-app.onrender.com/api/drop',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || drop_secret
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 120000
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
        body := '{}'::jsonb,
        timeout_milliseconds := 120000
    ) INTO drop_response;
END;
$$;
\`\`\`

**Check request results**:

\`\`\`sql
-- View recent HTTP responses from pg_net
SELECT id, status_code, content::text, created 
FROM net._http_response 
ORDER BY created DESC 
LIMIT 5;
\`\`\`

### 3. Schedule Cron Jobs

Berlin uses CEST (UTC+2) in summer and CET (UTC+1) in winter. We need **two schedules** that call the endpoint:

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

**How it works**: Both schedules run year-round. In winter, 16:00 UTC = 17:00 Berlin and 17:00 UTC = 18:00 Berlin. The `/api/drop` endpoint has a **time guard** that only runs the drop when it's Friday 18:00-18:59 Berlin time. The 17:00 Berlin call gets `{skipped: true, reason: "Not Friday 18:00-18:59"}`. Only the 18:00 Berlin run actually drops songs.

### 4. Wake-up Pings

Render free tier sleeps after 15 minutes of inactivity and takes **30-60 seconds** to cold start. We wake it up before the drop:

\`\`\`sql
-- Create health check ping function
CREATE OR REPLACE FUNCTION ping_health()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    ping_response bigint;
BEGIN
    SELECT net.http_get(
        url := 'https://your-app.onrender.com/api/health',
        timeout_milliseconds := 120000
    ) INTO ping_response;
END;
$$;

-- Wake-up ping at 15:55 UTC on Fridays (before 16:00 summer drop)
SELECT cron.schedule(
    'wakeup-summer',
    '55 15 * 3-10 5',
    $$SELECT ping_health()$$
);

-- Wake-up ping at 16:55 UTC on Fridays (before 17:00 winter drop)
SELECT cron.schedule(
    'wakeup-winter',
    '55 16 * 11-2 5',
    $$SELECT ping_health()$$
);
\`\`\`

**How it works**: The ping at 15:55 UTC wakes the service before the 16:00 UTC summer schedule. The ping at 16:55 UTC wakes it before the 17:00 UTC winter schedule. With a 60-second buffer, the service is warm when the drop request arrives.

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

The `/api/drop` endpoint has a time guard that only runs on Friday 18:00-18:59 Berlin time.

**During drop window (Friday 18:00-18:59 Berlin)**:

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

**Outside drop window** (returns 200 but skips):

\`\`\`json
{
  "skipped": true,
  "reason": "Not Friday 18:00-18:59 Berlin time (currently Thu 15:00 Berlin)",
  "berlinTime": "2024-10-24T15:00:00.000Z"
}
\`\`\`

**Force run** (for testing, bypasses time guard):

\`\`\`bash
curl -X POST "https://your-app.onrender.com/api/drop?force=true" \\
  -H "Authorization: Bearer your-drop-secret" \\
  -H "Content-Type: application/json"
\`\`\`

Response includes `"forced": true`.

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
