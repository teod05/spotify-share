import { supabase } from "../db.js";
import { addSongToPlaylist } from "../utils/spotify.js";

export async function runDrop() {
    console.log('[Friday Drop] Starting drop job...')
    
    try {
        const { data: pendingSongs, error: songsError } = await supabase
            .from('songs')
            .select(`
                id,
                song_link,
                user_id,
                users (
                    name
                )
            `)
            .is('posted_at', null)

        if (songsError) {
            throw songsError
        }

        if (!pendingSongs || pendingSongs.length === 0) {
            console.log('[Friday Drop] No pending songs to add')
            return
        }

        const successfullyAdded = []

        for (const song of pendingSongs) {
            try {
                const user = song.users

                await addSongToPlaylist(song.id, song.song_link, song.user_id)
                
                successfullyAdded.push(song.id)
                console.log(`[Friday Drop] Successfully added song ${song.id} by ${user.name}`)
            } catch (error) {
                console.error(`[Friday Drop] Error processing song ${song.id}:`, error.message)
            }
        }

        console.log(`[Friday Drop] Completed: ${successfullyAdded.length} of ${pendingSongs.length} songs added successfully`)
    } catch (error) {
        console.error('[Friday Drop] Error:', error)
    }
}
