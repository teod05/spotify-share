export const mockUser = {
  id: 1,
  name: 'You',
  email: 'user@example.com'
};

export const mockPartner = {
  id: 2,
  name: 'Her',
  email: 'partner@example.com'
};

export const mockPicks = {
  yourPick: {
    trackTitle: 'Blinding Lights',
    artist: 'The Weeknd',
    album: 'After Hours',
    albumArt: null,
    addedAt: new Date('2024-10-21T21:14:00'),
    note: 'This song just makes me feel so energized! Perfect for morning runs and the synth-wave vibe is incredible.'
  },
  herPick: {
    hasSubmitted: true,
    submittedAt: new Date('2024-10-23T19:02:00'),
    isLocked: true
  }
};

export const mockEmptyPicks = {
  yourPick: null,
  herPick: {
    hasSubmitted: false,
    isLocked: false
  }
};
