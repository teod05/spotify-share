import { createClient } from "@supabase/supabase-js";

// This client uses the service role key, which skips Supabase row level
// security. It must only ever run on the server. Session storage is off
// because each request brings its own user token in a cookie.
export const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    }
)

