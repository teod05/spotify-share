import { useState, useEffect } from 'react';
import './History.css';

function History() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const response = await fetch('/api/history', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setSongs(data);
        }
      } catch (err) {
        console.error('Error fetching history:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchHistory();
  }, []);

  function groupByDate(songs) {
    const groups = {};
    songs.forEach(song => {
      const date = new Date(song.posted_at).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(song);
    });
    return groups;
  }

  if (loading) {
    return <div className="history-container">Loading...</div>;
  }

  if (songs.length === 0) {
    return (
      <div className="history-container">
        <h1>History</h1>
        <p className="empty-message">No songs posted yet. Add your first pick!</p>
      </div>
    );
  }

  const groupedSongs = groupByDate(songs);

  return (
    <div className="history-container">
      <h1>History</h1>
      <p className="subtitle">{songs.length} song{songs.length !== 1 ? 's' : ''} added to the playlist</p>

      <div className="history-list">
        {Object.entries(groupedSongs).map(([date, dateSongs]) => (
          <div key={date} className="history-group">
            <h2 className="date-header">{date}</h2>
            {dateSongs.map(song => (
              <div key={song.id} className="history-item">
                {song.thumbnail_url ? (
                  <img src={song.thumbnail_url} alt={song.title} className="history-thumbnail" />
                ) : (
                  <div className="history-thumbnail-placeholder">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                    </svg>
                  </div>
                )}
                <div className="history-details">
                  <div className="history-title-row">
                    <div className="history-title">{song.title}</div>
                    {song.is_late && <span className="late-tag">LATE</span>}
                  </div>
                  <div className="history-meta">
                    <span className="history-user">{song.user_name}</span>
                    <span className="history-dot">·</span>
                    <a href={song.song_link} target="_blank" rel="noopener noreferrer" className="history-link">
                      Open in Spotify
                    </a>
                  </div>
                  {song.description && (
                    <p className="history-description">{song.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default History;
