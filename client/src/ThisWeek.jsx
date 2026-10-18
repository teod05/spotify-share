import { useState, useEffect } from 'react';
import { mockPicks } from './mockData';
import './ThisWeek.css';

function ThisWeek() {
  const [picks] = useState(mockPicks);
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    function getNextFridayDrop() {
      const now = new Date();
      const berlinTimeStr = now.toLocaleString('en-US', { timeZone: 'Europe/Berlin' });
      const berlin = new Date(berlinTimeStr);
      const day = berlin.getDay();
      
      let daysUntilFriday = (5 - day + 7) % 7;
      
      const nextFriday = new Date(berlin);
      nextFriday.setDate(berlin.getDate() + daysUntilFriday);
      nextFriday.setHours(18, 0, 0, 0);
      
      if (daysUntilFriday === 0 && berlin.getHours() >= 18) {
        nextFriday.setDate(nextFriday.getDate() + 7);
      }
      
      return nextFriday;
    }

    function updateCountdown() {
      const now = new Date();
      const berlinTimeStr = now.toLocaleString('en-US', { timeZone: 'Europe/Berlin' });
      const berlin = new Date(berlinTimeStr);
      const nextFriday = getNextFridayDrop();
      const diff = nextFriday - berlin;
      
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
  }, []);

  function getWeekInfo() {
    const now = new Date();
    const berlinTimeStr = now.toLocaleString('en-US', { timeZone: 'Europe/Berlin' });
    const berlin = new Date(berlinTimeStr);
    const day = berlin.getDay();
    
    let daysUntilFriday = (5 - day + 7) % 7;
    const nextFriday = new Date(berlin);
    nextFriday.setDate(berlin.getDate() + daysUntilFriday);
    nextFriday.setHours(18, 0, 0, 0);
    
    if (daysUntilFriday === 0 && berlin.getHours() >= 18) {
      nextFriday.setDate(nextFriday.getDate() + 7);
    }
    
    const monday = new Date(nextFriday);
    const mondayDay = nextFriday.getDay();
    const daysFromMonday = mondayDay === 0 ? 6 : mondayDay - 1;
    monday.setDate(nextFriday.getDate() - daysFromMonday);
    
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
    
    const formatDate = (date) => {
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      return `${month} ${date.getDate()}`;
    };
    
    const formatRange = () => {
      const mondayMonth = monday.getMonth();
      const sundayMonth = sunday.getMonth();
      
      if (mondayMonth === sundayMonth) {
        return `${monday.toLocaleDateString('en-US', { month: 'short' })} ${monday.getDate()}–${sunday.getDate()}`;
      } else {
        return `${formatDate(monday)}–${formatDate(sunday)}`;
      }
    };
    
    return `Week ${weekNumber} · ${formatRange()}`;
  }

  function formatTimestamp(date) {
    const day = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `ADDED ${day} ${time}`;
  }

  return (
    <div className="thisweek-container">
      <div className="thisweek-header">
        <h1>This week's picks</h1>
        <p className="week-info">{getWeekInfo()}</p>
        <div className="status-line">
          <span className="drops-info">Drops Friday 18:00 · {countdown}</span>
          <span className="progress-pill">2 of 2 picks in</span>
        </div>
      </div>

      <div className="picks-grid">
        <div className="pick-card">
          <div className="card-header">
            <h2>Your pick</h2>
            {picks.yourPick && (
              <button className="edit-button" onClick={() => console.log('Edit clicked')}>
                Edit
              </button>
            )}
          </div>
          
          {picks.yourPick ? (
            <div className="pick-content">
              <div className="track-info">
                <div className="album-art-placeholder">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                  </svg>
                </div>
                <div className="track-details">
                  <div className="track-title">{picks.yourPick.trackTitle}</div>
                  <div className="track-artist">{picks.yourPick.artist}</div>
                  <div className="track-album">{picks.yourPick.album}</div>
                </div>
              </div>
              <div className="timestamp">{formatTimestamp(picks.yourPick.addedAt)}</div>
              <div className="note">
                <div className="note-label">Why this song?</div>
                <p>{picks.yourPick.note}</p>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <p>You haven't picked a song yet</p>
              <button className="add-button" onClick={() => console.log('Add pick clicked')}>
                Add your pick
              </button>
            </div>
          )}
        </div>

        <div className="pick-card">
          <div className="card-header">
            <h2>Her pick</h2>
          </div>
          
          {picks.herPick.hasSubmitted ? (
            <div className="pick-content locked">
              <div className="lock-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                </svg>
              </div>
              <div className="locked-title">Hidden until Friday</div>
              <div className="locked-subtitle">Unlocks at 18:00</div>
              <div className="timestamp">
                {picks.herPick.submittedAt && `SUBMITTED ${picks.herPick.submittedAt.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()} ${picks.herPick.submittedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`}
              </div>
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
