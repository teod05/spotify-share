import { useState, useEffect } from 'react';
import './ThisWeek.css';

function ThisWeek() {
  const [weekData, setWeekData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState('');
  const [showPickForm, setShowPickForm] = useState(false);
  const [pickForm, setPickForm] = useState({ song_link: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchWeekData();
  }, []);

  async function fetchWeekData() {
    try {
      const response = await fetch('/api/week', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setWeekData(data);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!weekData?.dropAt) return;

    function updateCountdown() {
      const now = new Date();
      const drop = new Date(weekData.dropAt);
      const diff = drop - now;
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      if (days > 0) {
        setCountdown(`${days} day${days !== 1 ? 's' : ''} left`);
      } else if (hours > 0) {
        setCountdown(`${hours} hour${hours !== 1 ? 's' : ''} left`);
      } else {
        setCountdown('Drops soon!');
      }
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [weekData]);

  function getWeekInfo() {
    if (!weekData?.dropAt) return '';
    
    const dropDate = new Date(weekData.dropAt);
    const monday = new Date(dropDate);
    const mondayDay = dropDate.getDay();
    const daysFromMonday = mondayDay === 0 ? 6 : mondayDay - 1;
    monday.setDate(dropDate.getDate() - daysFromMonday);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    const getISOWeek = (date) => {
      const tempDate = new Date(date);
      tempDate.setHours(0, 0, 0, 0);
      tempDate.setDate(tempDate.getDate() + 4 - (tempDate.getDay() || 7));
      const yearStart = new Date(tempDate.getFullYear(), 0, 1);
      const weekNumber = Math.ceil((((tempDate - yearStart) / 86400000) + 1) / 7);
      return weekNumber;
    };
    
    const weekNumber = getISOWeek(monday);
    
    const formatRange = () => {
      const mondayMonth = monday.getMonth();
      const sundayMonth = sunday.getMonth();
      
      if (mondayMonth === sundayMonth) {
        return `${monday.toLocaleDateString('en-US', { month: 'short' })} ${monday.getDate()}–${sunday.getDate()}`;
      } else {
        return `${monday.toLocaleDateString('en-US', { month: 'short' })} ${monday.getDate()}–${sunday.toLocaleDateString('en-US', { month: 'short' })} ${sunday.getDate()}`;
      }
    };
    
    return `Week ${weekNumber} · ${formatRange()}`;
  }

  function formatTimestamp(date) {
    const d = new Date(date);
    const day = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `ADDED ${day} ${time}`;
  }

  function handleEditPick() {
    if (weekData?.you) {
      setPickForm({
        song_link: weekData.you.song_link,
        description: weekData.you.description
      });
    }
    setShowPickForm(true);
  }

  async function handleSavePick(e) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(pickForm)
      });

      const data = await response.json();

      if (response.ok) {
        setShowPickForm(false);
        setPickForm({ song_link: '', description: '' });
        fetchWeekData();
      } else {
        setError(data.message || 'Failed to save pick');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const picksIn = (weekData?.you ? 1 : 0) + (weekData?.them?.submitted ? 1 : 0);

  if (loading) {
    return <div className="thisweek-container">Loading...</div>;
  }

  return (
    <div className="thisweek-container">
      <div className="thisweek-header">
        <h1>This week's picks</h1>
        <p className="week-info">{getWeekInfo()}</p>
        <div className="status-line">
          <span className="drops-info">Drops Friday 18:00 · {countdown}</span>
          <span className="progress-pill">{picksIn} of 2 picks in</span>
        </div>
      </div>

      {showPickForm && (
        <div className="pick-form-overlay" onClick={() => setShowPickForm(false)}>
          <div className="pick-form-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{weekData?.you ? 'Edit your pick' : 'Add your pick'}</h2>
            <form onSubmit={handleSavePick}>
              <div className="form-group">
                <label htmlFor="song_link">Spotify track link</label>
                <input
                  id="song_link"
                  type="text"
                  value={pickForm.song_link}
                  onChange={(e) => setPickForm({ ...pickForm, song_link: e.target.value })}
                  placeholder="https://open.spotify.com/track/..."
                  required
                  disabled={saving}
                />
              </div>
              <div className="form-group">
                <label htmlFor="description">Why this one?</label>
                <textarea
                  id="description"
                  value={pickForm.description}
                  onChange={(e) => setPickForm({ ...pickForm, description: e.target.value })}
                  placeholder="What made you pick this song?"
                  required
                  maxLength={280}
                  rows={4}
                  disabled={saving}
                />
                <div className="char-count">{pickForm.description.length}/280</div>
              </div>
              {error && <div className="error-message">{error}</div>}
              <div className="form-actions">
                <button type="button" onClick={() => setShowPickForm(false)} disabled={saving} className="cancel-button">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="save-button">
                  {saving ? 'Saving...' : 'Save pick'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="picks-grid">
        <div className="pick-card">
          <div className="card-header">
            <h2>Your pick</h2>
            {weekData?.you && (
              <button className="edit-button" onClick={handleEditPick}>
                Edit
              </button>
            )}
          </div>
          
          {weekData?.you ? (
            <div className="pick-content">
              <div className="track-info">
                {weekData.you.thumbnail_url ? (
                  <img src={weekData.you.thumbnail_url} alt={weekData.you.title} className="album-art" />
                ) : (
                  <div className="album-art-placeholder">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                    </svg>
                  </div>
                )}
                <div className="track-details">
                  <div className="track-title">{weekData.you.title}</div>
                  <a href={weekData.you.song_link} target="_blank" rel="noopener noreferrer" className="spotify-link">
                    Open in Spotify →
                  </a>
                </div>
              </div>
              <div className="timestamp">{formatTimestamp(weekData.you.created_at)}</div>
              <div className="note">
                <div className="note-label">Why this song?</div>
                <p>{weekData.you.description}</p>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <p>You haven't picked a song yet</p>
              <button className="add-button" onClick={() => setShowPickForm(true)}>
                Add your pick
              </button>
            </div>
          )}
        </div>

        <div className="pick-card">
          <div className="card-header">
            <h2>Their pick</h2>
          </div>
          
          {weekData?.them?.submitted ? (
            <div className="pick-content locked">
              <div className="lock-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                </svg>
              </div>
              <div className="locked-title">Hidden until Friday</div>
              <div className="locked-subtitle">Unlocks at 18:00</div>
              {weekData.them.created_at && (
                <div className="timestamp">
                  {`SUBMITTED ${new Date(weekData.them.created_at).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()} ${new Date(weekData.them.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`}
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <p>Not picked yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ThisWeek;
