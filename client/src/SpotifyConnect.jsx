import './SpotifyConnect.css';

function SpotifyConnect({ onContinue }) {
  return (
    <div className="spotify-connect-container">
      <div className="spotify-connect-content">
        <svg className="spotify-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
        </svg>
        
        <h1>Connect your Spotify</h1>
        <p className="subtitle">
          Connect your Spotify account to add songs to the shared playlist.
          Your picks will show as added by you.
        </p>

        <a href="/spotify-login" className="connect-button">
          Connect Spotify
        </a>

        <button onClick={onContinue} className="later-link">
          I'll do this later
        </button>
      </div>
    </div>
  );
}

export default SpotifyConnect;
