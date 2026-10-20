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
            return { total: 0, added: 0, failed: 0 }
        }

        const successfullyAdded = []
        const failed = []

        for (const song of pendingSongs) {
            try {
                const user = song.users

                await addSongToPlaylist(song.id, song.song_link, song.user_id)
                
                successfullyAdded.push(song.id)
                console.log(`[Friday Drop] Successfully added song ${song.id} by ${user.name}`)
            } catch (error) {
                console.error(`[Friday Drop] Error processing song ${song.id}:`, error.message)
                failed.push({ id: song.id, error: error.message })
            }
        }

        const result = {
            total: pendingSongs.length,
            added: successfullyAdded.length,
            failed: failed.length
        }

        console.log(`[Friday Drop] Completed: ${result.added} of ${result.total} songs added successfully`)
        return result
    } catch (error) {
        console.error('[Friday Drop] Error:', error)
        throw error
    }
}
