export function parseSpotifyTrackLink(link) {
    if (!link || typeof link !== 'string') {
        return null
    }

    const trimmed = link.trim()
    
    // Handle spotify:track:ID format
    const uriMatch = trimmed.match(/^spotify:track:([a-zA-Z0-9]+)$/)
    if (uriMatch) {
        return uriMatch[1]
    }
    
    // Handle https://open.spotify.com/track/ID format (strip query params)
    const urlMatch = trimmed.match(/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/)
    if (urlMatch) {
        return urlMatch[1]
    }
    
    return null
}

export function normalizeSpotifyTrackLink(link) {
    const trackId = parseSpotifyTrackLink(link)
    if (!trackId) {
        return null
    }
    return `https://open.spotify.com/track/${trackId}`
}

export async function getTrackMetadata(trackLink) {
    try {
        const normalized = normalizeSpotifyTrackLink(trackLink)
        if (!normalized) {
            return null
        }
        
        const response = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(normalized)}`)
        if (!response.ok) {
            return null
        }
        
        const data = await response.json()
        return {
            title: data.title || 'Unknown Track',
            thumbnail_url: data.thumbnail_url || null
        }
    } catch (error) {
        console.error('Error fetching track metadata:', error)
        return null
    }
}
