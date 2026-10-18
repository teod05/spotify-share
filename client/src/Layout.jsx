import { useState, useEffect } from 'react';
import ThisWeek from './ThisWeek';
import History from './History';
import Settings from './Settings';
import './Layout.css';

function Layout({ user, onLogout }) {
  const params = new URLSearchParams(window.location.search);
  const spotifyStatus = params.get('spotify');
  
  const [currentView, setCurrentView] = useState(spotifyStatus ? 'settings' : 'thisweek');
  const [spotifyMessage, setSpotifyMessage] = useState(null);
  const [updatedUser, setUpdatedUser] = useState(user);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('spotify');
    
    if (!status) return;
    
    // This is intentional: we set state once based on query param, then clean up
    /* eslint-disable react-hooks/set-state-in-effect */
    if (status === 'connected') {
      setSpotifyMessage({ type: 'success', text: 'Spotify connected successfully!' });
      
      fetch('/api/me', { credentials: 'include' })
        .then(res => res.json())
        .then(data => setUpdatedUser(data))
        .catch(() => {});
    } else if (status === 'error') {
      const reason = urlParams.get('reason') || 'unknown';
      setSpotifyMessage({ type: 'error', text: `Failed to connect Spotify: ${reason}` });
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    
    window.history.replaceState({}, '', window.location.pathname);
    
    const timer = setTimeout(() => setSpotifyMessage(null), 5000);
    return () => clearTimeout(timer);
  }, []);

  function renderView() {
    switch (currentView) {
      case 'thisweek':
        return <ThisWeek />;
      case 'history':
        return <History />;
      case 'settings':
        return <Settings user={updatedUser} onLogout={onLogout} spotifyMessage={spotifyMessage} />;
      default:
        return <ThisWeek />;
    }
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <svg className="brand-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
          </svg>
          <span>Spotify Share</span>
        </div>
        <nav className="nav">
          <button
            className={`nav-item ${currentView === 'thisweek' ? 'active' : ''}`}
            onClick={() => setCurrentView('thisweek')}
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
            <span>This week</span>
          </button>
          <button
            className={`nav-item ${currentView === 'history' ? 'active' : ''}`}
            onClick={() => setCurrentView('history')}
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
            </svg>
            <span>History</span>
          </button>
          <button
            className={`nav-item ${currentView === 'settings' ? 'active' : ''}`}
            onClick={() => setCurrentView('settings')}
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
            <span>Settings</span>
          </button>
        </nav>
      </aside>

      <main className="main-content">
        {renderView()}
      </main>

      <nav className="bottom-nav">
        <button
          className={`bottom-nav-item ${currentView === 'thisweek' ? 'active' : ''}`}
          onClick={() => setCurrentView('thisweek')}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
          </svg>
          <span>This week</span>
        </button>
        <button
          className={`bottom-nav-item ${currentView === 'history' ? 'active' : ''}`}
          onClick={() => setCurrentView('history')}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
          </svg>
          <span>History</span>
        </button>
        <button
          className={`bottom-nav-item ${currentView === 'settings' ? 'active' : ''}`}
          onClick={() => setCurrentView('settings')}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
          </svg>
          <span>Settings</span>
        </button>
      </nav>
    </div>
  );
}

export default Layout;
