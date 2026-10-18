import './Settings.css';

function Settings({ user, onLogout }) {
  async function handleLogout() {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
      });
      onLogout();
    } catch (err) {
      console.error('Error logging out:', err);
      onLogout();
    }
  }

  return (
    <div className="settings-container">
      <h1>Settings</h1>

      <div className="settings-section">
        <h2>Spotify Connection</h2>
        <div className="setting-item">
          <div className="setting-info">
            <div className="setting-label">Status</div>
            <div className="setting-value">
              {user.spotifyConnected ? (
                <span className="status-connected">✓ Connected</span>
              ) : (
                <span className="status-disconnected">Not connected</span>
              )}
            </div>
          </div>
          {!user.spotifyConnected && (
            <a href="/spotify-login" className="connect-spotify-button">
              Connect Spotify
            </a>
          )}
        </div>
      </div>

      <div className="settings-section">
        <h2>Drop Schedule</h2>
        <div className="setting-item">
          <div className="setting-info">
            <div className="setting-label">Weekly drop time</div>
            <div className="setting-value">Fridays at 18:00 (Berlin time)</div>
            <p className="setting-description">
              Songs are automatically added to the shared playlist every Friday at 18:00 Europe/Berlin timezone.
            </p>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h2>Account</h2>
        <div className="setting-item">
          <div className="setting-info">
            <div className="setting-label">Email</div>
            <div className="setting-value">{user.email}</div>
          </div>
        </div>
        <div className="setting-item">
          <div className="setting-info">
            <div className="setting-label">Name</div>
            <div className="setting-value">{user.name || 'Not set'}</div>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <button onClick={handleLogout} className="signout-button">
          Sign out
        </button>
      </div>
    </div>
  );
}

export default Settings;
