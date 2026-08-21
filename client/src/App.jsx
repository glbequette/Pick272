import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import LeagueModal from './components/LeagueModal';
import LeagueStandings from './components/LeagueStandings';
import GlobalLeaderboard from './components/GlobalLeaderboard';
import PlayoffBracket from './components/PlayoffBracket';
import AccountSettings from './components/AccountSettings';
import FriendsHub from './components/FriendsHub';
import { getTeamTheme } from './teamTheme';

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('nfl_picker_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLeagues, setUserLeagues] = useState([]);
  const [showLeagueModal, setShowLeagueModal] = useState(false);
  const [activeLeague, setActiveLeague] = useState(null);
  const [totalLeaguesCount, setTotalLeaguesCount] = useState(0);
  
  // Navigation State
  const [view, setView] = useState('dashboard'); // 'dashboard' | 'picks' | 'standings'
  const [seasonTab, setSeasonTab] = useState('regular'); // 'regular' | 'playoffs'

  const [picks, setPicks] = useState({});
  const [tiebreaker, setTiebreaker] = useState('');
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [submitStatus, setSubmitStatus] = useState(null);
  const currentNFLWeek = 1;

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    // Fetch NFL Schedule (FIXED: Backticks)
    fetch(`${API_BASE}/api/games`)
      .then((res) => res.json())
      .then((data) => {
        setGames(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching games:', err);
        setLoading(false);
      });

    // Fetch Total Platform Leagues (FIXED: Backticks)
    fetch(`${API_BASE}/api/leagues/count`)
      .then((res) => res.json())
      .then((data) => setTotalLeaguesCount(data.count || 0))
      .catch((err) => console.error('Error fetching league count:', err));

    // Fetch User Leagues
    if (user) {
      fetchUserLeagues();
    }
  }, [user]);

  const fetchUserLeagues = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/leagues/user/${user.id}`);
      const data = await res.json();
      setUserLeagues(data);
    } catch (err) {
      console.error('Error fetching user leagues:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('nfl_picker_token');
    localStorage.removeItem('nfl_picker_user');
    setUser(null);
    setActiveLeague(null);
    setView('dashboard');
  };

  const handleSelectLeague = async (league) => {
    setActiveLeague(league);
    setView('picks');
    setSubmitStatus(null);
    setSeasonTab('regular');
    setSelectedWeek(league.pickMode === 'weekly' ? currentNFLWeek : 1);

    try {
      const res = await fetch(`${API_BASE}/api/picks/${user.id}/${league._id}`);
      const data = await res.json();
      if (data.picks) {
          const loadedPicks = {};
          data.picks.forEach(p => { loadedPicks[p.gameId] = p.selectedTeam; });
          setPicks(loadedPicks);
          if (data.tiebreaker) setTiebreaker(data.tiebreaker); 
        }
    } catch (err) {
      console.error('Failed to fetch league picks:', err);
    }
  };

  const handleSelectTeam = async (gameId, teamName) => {
    const updatedPicks = { ...picks, [gameId]: teamName };
    setPicks(updatedPicks);
    localStorage.setItem('nfl_picks_draft', JSON.stringify(updatedPicks));

    if (activeLeague && user) {
      try {
        // FIXED: Backticks
        const response = await fetch(`${API_BASE}/api/picks/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id, 
            leagueId: activeLeague._id, 
            picks: updatedPicks,
            isSubmitted: true
          })
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to auto-save.');
        }

        console.log(`Successfully auto-saved pick: ${teamName} for game ${gameId}`);

      } catch (err) {
        console.error('Auto-save error:', err.message);
        alert('Warning: Failed to auto-save your pick. Please check your connection.');
      }
    }
  };

  const handleLockPicks = async () => {
    setSubmitStatus({ type: 'loading', text: 'Locking picks...' });
    try {
      // FIXED: Backticks
      const response = await fetch(`${API_BASE}/api/picks/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          leagueId: activeLeague._id,
          picks: picks,
          isSubmitted: true
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to submit picks.');

      setSubmitStatus({ type: 'success', text: `Success! Picks locked for ${activeLeague.name}.` });
    } catch (err) {
      setSubmitStatus({ type: 'error', text: err.message });
    }
  };

  const getTeamRecord = (team) => {
    return ""; 
  };

  const totalPicksMade = Object.keys(picks).length;
  const currentWeekGames = games.filter((g) => g.week === selectedWeek);
  const maxPicks = activeLeague?.pickMode === 'weekly' 
    ? (currentWeekGames.length || 16) 
    : (games.length || 272);
  const progressPercent = maxPicks > 0 ? ((totalPicksMade / maxPicks) * 100).toFixed(0) : 0;

  const handleTiebreakerSave = async (value) => {
    if (!value || !activeLeague) return;
    try {
      // FIXED: Backticks
      await fetch(`${API_BASE}/api/picks/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          leagueId: activeLeague._id,
          picks, 
          tiebreaker: Number(value)
        })
      });
    } catch (err) {
      console.error('Failed to save tiebreaker', err);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0b0f19', color: '#f8fafc' }}>
      
      {/* Broadcast Header */}
      <header className="app-header" style={{ background: '#111827', borderBottom: '1px solid #1f2937', padding: '16px 24px', position: 'sticky', top: 0, zIndex: 50 }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => { setActiveLeague(null); setView('dashboard'); }}>
          <h1 style={{ fontFamily: 'Teko, sans-serif', fontSize: '28px', margin: 0, letterSpacing: '1px' }}>PICK</h1>
          <div style={{ background: '#22c55e', color: '#0b0f19', fontFamily: 'Teko, sans-serif', fontSize: '22px', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>272</div>
        </div>

        {user && (
          <div className="header-buttons">
            <button onClick={() => { setActiveLeague(null); setView('dashboard'); }} style={{ background: '#1f2937', border: '1px solid #374151', color: '#38bdf8', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', padding: '6px 14px' }}>
              Dashboard
            </button>
            <button onClick={() => { setActiveLeague(null); setView('account'); }} style={{ background: '#1f2937', border: '1px solid #374151', color: '#f8fafc', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', padding: '6px 14px' }}>
              Account
            </button>
            <button onClick={() => { setActiveLeague(null); setView('friends'); }} style={{ background: '#1f2937', border: '1px solid #374151', color: '#a855f7', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', padding: '6px 14px' }}>
              Friends
            </button>
            <button onClick={handleLogout} style={{ background: '#1f2937', border: '1px solid #374151', color: '#f87171', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', padding: '6px 14px' }}>
              Sign Out
            </button>
          </div>
        )}
      </header>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px' }}>
        {!user ? (
          <Auth onAuthSuccess={(authenticatedUser) => setUser(authenticatedUser)} />
        ) : view === 'account' ? (
          <AccountSettings user={user} setUser={setUser} onBack={() => setView('dashboard')} />
        ) : view === 'friends' ? (
          <FriendsHub user={user} onBack={() => setView('dashboard')} />
        ) : view === 'dashboard' ? (
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {/* Quick Stats Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              <div style={{ background: '#131c2e', border: '1px solid #1e293b', padding: '16px 20px', borderRadius: '12px' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '800', letterSpacing: '0.05em' }}>TOTAL LEAGUES</span>
                <div style={{ fontFamily: 'Teko, sans-serif', fontSize: '32px', color: '#38bdf8', marginTop: '4px' }}>
                  {totalLeaguesCount}
                </div>
              </div>
              <div style={{ background: '#131c2e', border: '1px solid #1e293b', padding: '16px 20px', borderRadius: '12px' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '800', letterSpacing: '0.05em' }}>CURRENT NFL WEEK</span>
                <div style={{ fontFamily: 'Teko, sans-serif', fontSize: '32px', color: '#22c55e', marginTop: '4px' }}>
                  WEEK {currentNFLWeek}
                </div>
              </div>
              <div style={{ background: '#131c2e', border: '1px solid #1e293b', padding: '16px 20px', borderRadius: '12px' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '800', letterSpacing: '0.05em' }}>NFL GAMES PLAYED</span>
                <div style={{ fontFamily: 'Teko, sans-serif', fontSize: '32px', color: '#fbbf24', marginTop: '4px' }}>
                  {games.filter(g => g.status === 'final').length}
                </div>
              </div>
              <div style={{ background: '#131c2e', border: '1px solid #1e293b', padding: '16px 20px', borderRadius: '12px' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '800', letterSpacing: '0.05em' }}>MAX POSSIBLE PTS</span>
                <div style={{ fontFamily: 'Teko, sans-serif', fontSize: '32px', color: '#a855f7', marginTop: '4px' }}>
                  300 <span style={{ fontSize: '16px', color: '#94a3b8' }}>PTS</span>
                </div>
              </div>
            </div>

            {/* My Leagues Section */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontFamily: 'Teko, sans-serif', fontSize: '30px', margin: 0, letterSpacing: '0.5px' }}>MY LEAGUES</h2>
                <button
                  onClick={() => setShowLeagueModal(true)}
                  style={{
                    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                    border: 'none',
                    color: '#0b0f19',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontFamily: 'Teko, sans-serif',
                    fontSize: '18px',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                >
                  + CREATE / JOIN
                </button>
              </div>

              {userLeagues.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', background: '#131c2e', border: '1px dashed #334155', borderRadius: '12px', color: '#94a3b8' }}>
                  <p style={{ margin: '0 0 12px 0' }}>You haven't joined any leagues yet.</p>
                  <button onClick={() => setShowLeagueModal(true)} style={{ background: '#1f2937', border: '1px solid #334155', color: '#f8fafc', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer' }}>
                    Join a League
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {userLeagues.map((league) => (
                    <div
                      key={league._id}
                      onClick={() => handleSelectLeague(league)}
                      style={{
                        background: '#131c2e',
                        border: '1px solid #1e293b',
                        borderRadius: '12px',
                        padding: '18px',
                        cursor: 'pointer',
                        transition: 'transform 0.15s ease',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h3 style={{ fontFamily: 'Teko, sans-serif', fontSize: '24px', margin: 0, color: '#f8fafc' }}>
                          {league.name?.toUpperCase()}
                        </h3>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: '800',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: league.pickMode === 'season' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: league.pickMode === 'season' ? '#38bdf8' : '#fbbf24'
                          }}
                        >
                          {league.pickMode?.toUpperCase()} LOCK
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                        Invite Code: <strong style={{ color: '#94a3b8' }}>{league.inviteCode}</strong>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <GlobalLeaderboard currentUserId={user.id} />

            {showLeagueModal && (
              <LeagueModal
                user={user}
                onClose={() => setShowLeagueModal(false)}
                onLeagueSelected={() => {
                  fetchUserLeagues();
                  setShowLeagueModal(false);
                }}
              />
            )}
          </div>

        ) : view === 'standings' ? (
          <LeagueStandings 
            leagueId={activeLeague._id} 
            user={user} 
            games={games} 
            onBack={() => setView('picks')} 
            onLeaveSuccess={() => {
              fetchUserLeagues();
              setView('dashboard');
            }}
          />
        ) : (
          <>
            {/* Context Header */}
            <div style={{ background: '#131c2e', border: '1px solid #1e293b', borderRadius: '14px', padding: '20px 24px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ fontFamily: 'Teko, sans-serif', fontSize: '28px', letterSpacing: '0.5px', margin: 0, color: '#22c55e' }}>{activeLeague.name.toUpperCase()}</h2>
                  <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>
                    {activeLeague.pickMode === 'season' ? 'Make all 272 selections before the Season Opener.' : `Weekly Mode: Make your selections for Week ${currentNFLWeek}.`}
                  </p>
                </div>
                <button onClick={() => setView('standings')} style={{ background: '#1f2937', border: '1px solid #374151', color: '#f8fafc', padding: '8px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                  VIEW STANDINGS
                </button>
              </div>

              {/* Progress & Submit Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px', fontWeight: '600', color: '#94a3b8' }}>
                    <span>PROGRESS</span>
                    <span>{totalPicksMade} / {maxPicks}</span>
                  </div>
                  <div style={{ background: '#0b0f19', height: '8px', borderRadius: '4px', overflow: 'hidden', border: '1px solid #1e293b' }}>
                    <div style={{ width: `${progressPercent}%`, background: 'linear-gradient(90deg, #16a34a, #22c55e)', height: '100%', transition: 'width 0.4s' }} />
                  </div>
                </div>
              </div>

              {submitStatus && (
                <div style={{ marginTop: '16px', padding: '10px', borderRadius: '6px', fontSize: '13px', background: submitStatus.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: submitStatus.type === 'success' ? '#4ade80' : '#f87171' }}>
                  {submitStatus.text}
                </div>
              )}
            </div>

            {/* SEASON MODE VIEW */}
            {activeLeague.pickMode === 'season' ? (
              <>
                <div style={{ position: 'relative', marginBottom: '24px' }}>
                  <select
                    value={seasonTab === 'playoffs' ? 'playoffs' : selectedWeek}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'playoffs') {
                        setSeasonTab('playoffs');
                      } else {
                        setSeasonTab('regular');
                        setSelectedWeek(Number(val));
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 40px 12px 16px',
                      borderRadius: '8px',
                      border: '1px solid #1e293b',
                      background: '#131c2e',
                      color: seasonTab === 'playoffs' ? '#38bdf8' : '#22c55e',
                      fontFamily: 'Teko, sans-serif',
                      fontSize: '22px',
                      cursor: 'pointer',
                      outline: 'none',
                      appearance: 'none', 
                      fontWeight: '700',
                      letterSpacing: '1px'
                    }}
                  >
                    {Array.from({ length: 18 }, (_, i) => i + 1).map((weekNum) => (
                      <option key={weekNum} value={weekNum} style={{ color: '#ffffff' }}>
                        WEEK {weekNum}
                      </option>
                    ))}
                    
                    <option 
                      value="playoffs" 
                      disabled={totalPicksMade < (games.length || 272)}
                      style={{ color: '#ffffff', fontWeight: 'bold' }}
                    >
                      PLAYOFFS {totalPicksMade < (games.length || 272) ? '🔒 (Requires 272 Picks)' : '🏆'}
                    </option>
                  </select>
                  
                  <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94a3b8', fontSize: '14px' }}>
                    ▼
                  </div>
                </div>

                {seasonTab === 'regular' ? (
                  loading ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Loading schedule data...</div>
                  ) : (
                    <div style={{ display: 'grid', gap: '14px' }}>
                      {currentWeekGames.map((game) => {
                        const selectedTeam = picks[game.gameId];
                        const awayTheme = getTeamTheme(game.awayTeam);
                        const homeTheme = getTeamTheme(game.homeTeam);
                        const isAwaySelected = selectedTeam === game.awayTeam || selectedTeam === awayTheme.abbr;
                        const isHomeSelected = selectedTeam === game.homeTeam || selectedTeam === homeTheme.abbr;

                        const kickoffDate = new Date(game.kickoffTime);
                        const formattedTime = kickoffDate.toLocaleDateString('en-US', {
                          weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                        });

                        return (
                          <div key={game.gameId} style={{ background: '#131c2e', border: '1px solid #1e293b', borderRadius: '12px', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ textAlign: 'center', fontSize: '12px', color: '#64748b', fontWeight: '700', letterSpacing: '0.05em' }}>
                              {formattedTime.toUpperCase()}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '16px' }}>
                              <button
                                onClick={() => handleSelectTeam(game.gameId, game.awayTeam)}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '10px', cursor: 'pointer', border: selectedTeam === game.awayTeam ? `2px solid ${awayTheme.primary}` : '1px solid #283548', background: selectedTeam === game.awayTeam ? awayTheme.primary : '#0b0f19', color: selectedTeam === game.awayTeam ? awayTheme.text : '#f1f5f9', boxShadow: selectedTeam === game.awayTeam ? `0 0 16px ${awayTheme.primary}80` : 'none' }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <img src={awayTheme.logoUrl} alt={game.awayTeam} style={{ width: '40px', height: '40px', objectFit: 'contain', filter: selectedTeam === game.awayTeam ? 'drop-shadow(0px 0px 6px rgba(255, 255, 255, 0.6))' : 'none' }} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                  <span style={{ fontFamily: 'Teko, sans-serif', fontSize: '24px', letterSpacing: '0.5px', lineHeight: '1' }}>{game.awayTeam}</span>
                                </div>
                              </button>

                              <div style={{ fontFamily: 'Teko, sans-serif', fontSize: '22px', color: '#475569', fontWeight: '700' }}>@</div>

                              <button
                                onClick={() => handleSelectTeam(game.gameId, game.homeTeam)}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '10px', cursor: 'pointer', border: selectedTeam === game.homeTeam ? `2px solid ${homeTheme.primary}` : '1px solid #283548', background: selectedTeam === game.homeTeam ? homeTheme.primary : '#0b0f19', color: selectedTeam === game.homeTeam ? homeTheme.text : '#f1f5f9', boxShadow: selectedTeam === game.homeTeam ? `0 0 16px ${homeTheme.primary}80` : 'none' }}
                              >
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                  <span style={{ fontFamily: 'Teko, sans-serif', fontSize: '24px', letterSpacing: '0.5px', lineHeight: '1' }}>{game.homeTeam}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <img src={homeTheme.logoUrl} alt={game.homeTeam} style={{ width: '40px', height: '40px', objectFit: 'contain', filter: selectedTeam === game.homeTeam ? 'drop-shadow(0px 0px 6px rgba(255, 255, 255, 0.6))' : 'none' }} />
                                </div>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  <>
                    <PlayoffBracket 
                      regularSeasonPicks={picks}
                      games={games}
                      playoffPicks={picks}
                      onSelectPlayoffTeam={(gameId, team) => handleSelectTeam(gameId, team)}
                    />
                    
                    <div style={{ marginTop: '24px', background: '#131c2e', padding: '24px', borderRadius: '12px', border: '1px solid #1e293b', textAlign: 'center', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}>
                      <h3 style={{ color: '#f59e0b', fontFamily: 'Teko, sans-serif', fontSize: '28px', letterSpacing: '1px', margin: '0 0 8px 0' }}>SEASON TIEBREAKER</h3>
                      <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '16px', maxWidth: '600px', margin: '0 auto 16px auto' }}>
                        If multiple players finish tied for 1st place, the winner will be whoever closest predicts the <strong>TOTAL COMBINED POINTS</strong> scored by all 32 NFL teams across the entire season (including playoffs).
                      </p>
                      <input
                        type="number"
                        value={tiebreaker}
                        onChange={(e) => setTiebreaker(e.target.value)}
                        onBlur={(e) => handleTiebreakerSave(e.target.value)}
                        placeholder="e.g. 10000"
                        style={{ padding: '12px 24px', borderRadius: '8px', border: '1px solid #1e293b', background: '#0b0f19', color: '#22c55e', fontSize: '24px', fontFamily: 'Teko, sans-serif', textAlign: 'center', outline: 'none', width: '200px', fontWeight: 'bold' }}
                      />
                    </div>
                  </>
                )}
              </>
            ) : (
              <div style={{ display: 'grid', gap: '14px' }}>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Loading schedule...</div>
                ) : (
                  currentWeekGames.map((game) => {
                    const selectedTeam = picks[game.gameId];
                    const awayTheme = getTeamTheme(game.awayTeam);
                    const homeTheme = getTeamTheme(game.homeTeam);

                    const kickoffDate = new Date(game.kickoffTime);
                    const formattedTime = kickoffDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

                    return (
                      <div key={game.gameId} style={{ background: '#131c2e', border: '1px solid #1e293b', borderRadius: '12px', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ textAlign: 'center', fontSize: '12px', color: '#64748b', fontWeight: '700', letterSpacing: '0.05em' }}>
                          {formattedTime.toUpperCase()}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '16px' }}>
                          <button
                            onClick={() => handleSelectTeam(game.gameId, game.awayTeam)}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '10px', cursor: 'pointer', border: selectedTeam === game.awayTeam ? `2px solid ${awayTheme.primary}` : '1px solid #283548', background: selectedTeam === game.awayTeam ? awayTheme.primary : '#0b0f19', color: selectedTeam === game.awayTeam ? awayTheme.text : '#f1f5f9', boxShadow: selectedTeam === game.awayTeam ? `0 0 16px ${awayTheme.primary}80` : 'none' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <img src={awayTheme.logoUrl} alt={game.awayTeam} style={{ width: '40px', height: '40px', objectFit: 'contain', filter: selectedTeam === game.awayTeam ? 'drop-shadow(0px 0px 6px rgba(255, 255, 255, 0.6))' : 'none' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                              <span style={{ fontFamily: 'Teko, sans-serif', fontSize: '24px', letterSpacing: '0.5px', lineHeight: '1' }}>{game.awayTeam}</span>
                            </div>
                          </button>

                          <div style={{ fontFamily: 'Teko, sans-serif', fontSize: '22px', color: '#475569', fontWeight: '700' }}>@</div>

                          <button
                            onClick={() => handleSelectTeam(game.gameId, game.homeTeam)}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '10px', cursor: 'pointer', border: selectedTeam === game.homeTeam ? `2px solid ${homeTheme.primary}` : '1px solid #283548', background: selectedTeam === game.homeTeam ? homeTheme.primary : '#0b0f19', color: selectedTeam === game.homeTeam ? homeTheme.text : '#f1f5f9', boxShadow: selectedTeam === game.homeTeam ? `0 0 16px ${homeTheme.primary}80` : 'none' }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                              <span style={{ fontFamily: 'Teko, sans-serif', fontSize: '24px', letterSpacing: '0.5px', lineHeight: '1' }}>{game.homeTeam}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <img src={homeTheme.logoUrl} alt={game.homeTeam} style={{ width: '40px', height: '40px', objectFit: 'contain', filter: selectedTeam === game.homeTeam ? 'drop-shadow(0px 0px 6px rgba(255, 255, 255, 0.6))' : 'none' }} />
                            </div>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}