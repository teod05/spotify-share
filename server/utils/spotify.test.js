import { parseSpotifyTrackLink, normalizeSpotifyTrackLink } from './spotify.js';

function test(description, fn) {
    try {
        fn();
        console.log(`✓ ${description}`);
    } catch (error) {
        console.log(`✗ ${description}`);
        console.error(error.message);
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`${message}: expected ${expected}, got ${actual}`);
    }
}

test('parseSpotifyTrackLink - handles full URL', () => {
    const result = parseSpotifyTrackLink('https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp');
    assertEqual(result, '3n3Ppam7vgaVa1iaRUc9Lp', 'Should extract track ID from URL');
});

test('parseSpotifyTrackLink - handles URL with query params', () => {
    const result = parseSpotifyTrackLink('https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp?si=abc123');
    assertEqual(result, '3n3Ppam7vgaVa1iaRUc9Lp', 'Should extract track ID and strip query params');
});

test('parseSpotifyTrackLink - handles spotify: URI format', () => {
    const result = parseSpotifyTrackLink('spotify:track:3n3Ppam7vgaVa1iaRUc9Lp');
    assertEqual(result, '3n3Ppam7vgaVa1iaRUc9Lp', 'Should extract track ID from URI');
});

test('parseSpotifyTrackLink - returns null for invalid input', () => {
    assertEqual(parseSpotifyTrackLink('not a spotify link'), null, 'Should return null for invalid link');
    assertEqual(parseSpotifyTrackLink(''), null, 'Should return null for empty string');
    assertEqual(parseSpotifyTrackLink(null), null, 'Should return null for null');
});

test('normalizeSpotifyTrackLink - normalizes valid links', () => {
    const result = normalizeSpotifyTrackLink('spotify:track:3n3Ppam7vgaVa1iaRUc9Lp');
    assertEqual(result, 'https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp', 'Should normalize to HTTPS URL');
});

test('normalizeSpotifyTrackLink - returns null for invalid links', () => {
    assertEqual(normalizeSpotifyTrackLink('invalid'), null, 'Should return null for invalid link');
});

console.log('\nAll Spotify link parser tests completed\n');
