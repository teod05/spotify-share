import { createClient } from "@supabase/supabase-js";
// initializing a supabase client to talk with the database, since 
// server is talking secret_key is ued because our backend is trusted
export const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
)

