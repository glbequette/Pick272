import React, { useState, useEffect } from 'react';
import { getTeamTheme } from '../teamTheme';
import PlayoffBracket from './PlayoffBracket';

export default function LeagueStandings({ leagueId, user, onBack, onLeaveSuccess, games = [] }) {
  const [leagueData, setLeagueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [leaving, setLeaving] = useState(false);

  // Tab & View State
  const [viewTab, setViewTab] = useState('leaderboard'); // 'leaderboard' | 'weekly'
  const [selectedWeek, setSelectedWeek] = useState(1); // 1-18 or 'playoffs'
  const [weeklyData, setWeeklyData] = useState(null);
  const [expandedUserId, setExpandedUserId] = useState(null);

  // Bracket View State for Season Lock
  const [bracketPlayerId, setBracketPlayerId] = useState(user?.id);
  const [bracketPicksMap, setBracketPicksMap] = useState({});
  const [bracketLoading, setBracketLoading] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // 1. Fetch Overall Leaderboard
  useEffect(() => {
    fetch(`${API_BASE}/api/leagues/${leagueId}/standings`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setLeagueData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [leagueId]);

  // 2. Fetch Regular Season Weekly Leaderboard Picks (Weeks 1-18)
  useEffect(() => {
    if (viewTab === 'weekly' && selectedWeek !== 'playoffs') {
      setExpandedUserId(null);
      fetch(`${API_BASE}/api/picks/league/${leagueId}/week/${selectedWeek}`)
        .then((res) => res.json())
        .then((data) => setWeeklyData(data))
        .catch((err) => console.error('Error fetching weekly picks:', err));
    }
  }, [leagueId, viewTab, selectedWeek]);

  // 3. Fetch Selected Player's Full Picks when Playoffs tab is selected in Season Mode
  useEffect(() => {
    if (viewTab === 'weekly' && selectedWeek === 'playoffs' && bracketPlayerId) {
      setBracketLoading(true);
      fetch(`${API_BASE}/api/picks/${bracketPlayerId}/${leagueId}`)
        .then((res) => res.json())
        .then((data) => {
          const loaded = {};
          if (data?.picks) {
            data.picks.forEach((p) => { loaded[p.gameId] = p.selectedTeam; });
          }
          setBracketPicksMap(loaded);
          setBracketLoading(false);
        })
        .catch((err) => {
          console.error('Error fetching bracket picks:', err);
          setBracketLoading(false);
        });
    }
  }, [leagueId, viewTab, selectedWeek, bracketPlayerId]);

  const handleLeaveLeague = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to leave this league? This will permanently delete your picks and points for this group.'
    );
    if (!confirmed) return;

    setLeaving(true);
    try {
      const response = await fetch('${API_BASE}/api/leagues/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId, userId: user.id })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to leave league');
      if (onLeaveSuccess) onLeaveSuccess();
    } catch (err) {
      alert(err.message);
      setLeaving(false);
    }
  };

  const toggleUserExpanded = (id) => {
    setExpandedUserId(expandedUserId === id ? null : id);
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Loading league data...</div>;
  }

  if (error) {
    return <div style={{ textAlign: 'center', padding: '60px', color: '#ef4444' }}>Error: {error}</div>;
  }

  if (!leagueData) {
    return <div style={{ textAlign: 'center', padding: '60px', color: '#ef4444' }}>League not found.</div>;
  }

  const isSeasonMode = leagueData?.pickMode === 'season';

  // Navigation tab list for weekly section
  const weekNavItems = isSeasonMode
    ? [
        ...Array.from({ length: 18 }, (_, i) => ({ id: i + 1, label: `WEEK ${i + 1}` })),
        { id: 'playoffs', label: 'PLAYOFFS 🏆' }
      ]
    : [
        ...Array.from({ length: 18 }, (_, i) => ({ id: i + 1, label: `WEEK ${i + 1}` })),
        { id: 19, label: 'WILD CARD' },
        { id: 20, label: 'DIVISIONAL' },
        { id: 21, label: 'CONFERENCE' },
        { id: 22, label: 'SUPER BOWL' }
      ];

  return (
    <div style={{ padding: '24px 0' }}>
      <div style={{ background: '#131c2e', border: '1px solid #1e293b', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
        
        {/* Header */}
        <div style={{ padding: '24px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontFamily: 'Teko, sans-serif', fontSize: '32px', color: '#f8fafc', margin: 0, letterSpacing: '1px' }}>
              {leagueData.name?.toUpperCase()}
            </h2>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px', margin: 0 }}>
              Invite Code: <span style={{ background: '#0f172a', padding: '4px 8px', borderRadius: '4px', color: '#38bdf8', fontFamily: 'monospace', letterSpacing: '2px', fontWeight: 'bold' }}>{leagueData.inviteCode}</span>
            </p>
          </div>
          <button onClick={onBack} style={{ background: '#1f2937', border: '1px solid #374151', color: '#f8fafc', padding: '8px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', letterSpacing: '0.05em' }}>
            BACK TO PICKS
          </button>
        </div>

        {/* Top View Selector Tabs (Leaderboard vs Weekly Leaderboard) */}
        <div style={{ display: 'flex', borderBottom: '1px solid #1e293b' }}>
          <button
            onClick={() => setViewTab('leaderboard')}
            style={{
              flex: 1,
              padding: '16px',
              border: 'none',
              borderBottom: viewTab === 'leaderboard' ? '3px solid #22c55e' : '3px solid transparent',
              background: viewTab === 'leaderboard' ? 'rgba(34, 197, 94, 0.05)' : 'transparent',
              color: viewTab === 'leaderboard' ? '#22c55e' : '#94a3b8',
              fontSize: '14px',
              fontWeight: '800',
              letterSpacing: '0.1em',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            OVERALL LEADERBOARD
          </button>
          <button
            onClick={() => setViewTab('weekly')}
            style={{
              flex: 1,
              padding: '16px',
              border: 'none',
              borderBottom: viewTab === 'weekly' ? '3px solid #38bdf8' : '3px solid transparent',
              background: viewTab === 'weekly' ? 'rgba(56, 189, 248, 0.05)' : 'transparent',
              color: viewTab === 'weekly' ? '#38bdf8' : '#94a3b8',
              fontSize: '14px',
              fontWeight: '800',
              letterSpacing: '0.1em',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            WEEKLY LEADERBOARD
          </button>
        </div>

        {/* Content Area */}
        <div style={{ padding: '24px' }}>
          {viewTab === 'leaderboard' ? (
            /* OVERALL LEADERBOARD TABLE */
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '16px', fontSize: '11px', fontWeight: '800', color: '#64748b', letterSpacing: '0.1em', borderBottom: '1px solid #1e293b' }}>RANK</th>
                    <th style={{ padding: '16px', fontSize: '11px', fontWeight: '800', color: '#64748b', letterSpacing: '0.1em', borderBottom: '1px solid #1e293b' }}>PLAYER</th>
                    <th style={{ padding: '16px', fontSize: '11px', fontWeight: '800', color: '#64748b', letterSpacing: '0.1em', borderBottom: '1px solid #1e293b', textAlign: 'right' }}>TOTAL POINTS</th>
                  </tr>
                </thead>
                <tbody>
                  {leagueData.standings?.map((player, idx) => {
                    const isMe = player.userId === user.id;
                    return (
                      <tr key={player.userId} style={{ background: isMe ? 'rgba(34, 197, 94, 0.08)' : 'transparent', borderBottom: '1px solid #1e293b' }}>
                        <td style={{ padding: '16px', borderLeft: isMe ? '3px solid #22c55e' : '3px solid transparent' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: idx < 3 ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : '#1e293b', color: idx < 3 ? '#000' : '#94a3b8', fontSize: '13px', fontWeight: '800' }}>
                            {player.rank}
                          </div>
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px', fontWeight: isMe ? '700' : '500', color: isMe ? '#22c55e' : '#f8fafc' }}>
                          {player.username} {isMe && <span style={{ fontSize: '11px', opacity: 0.7 }}>(YOU)</span>}
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right', fontFamily: 'Teko, sans-serif', fontSize: '24px', fontWeight: '600', color: '#e2e8f0' }}>
                          {player.totalPoints}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* WEEKLY LEADERBOARD TAB */
            <>
              {/* Dropdown Week & Playoff Selector */}
              <div style={{ position: 'relative', marginBottom: '24px' }}>
                <select
                  value={selectedWeek}
                  onChange={(e) => {
                    const val = e.target.value;
                    const parsedVal = val === 'playoffs' ? 'playoffs' : Number(val);
                    setSelectedWeek(parsedVal);
                    
                    // If they select playoffs, default to scouting the #1 ranked player
                    if (parsedVal === 'playoffs' && !bracketPlayerId && leagueData.standings?.[0]?.userId) {
                      setBracketPlayerId(leagueData.standings[0].userId);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 40px 12px 16px',
                    borderRadius: '8px',
                    border: '1px solid #1e293b',
                    background: '#131c2e',
                    color: selectedWeek === 'playoffs' ? '#38bdf8' : '#22c55e',
                    fontFamily: 'Teko, sans-serif',
                    fontSize: '22px',
                    cursor: 'pointer',
                    outline: 'none',
                    appearance: 'none',
                    fontWeight: '700',
                    letterSpacing: '1px'
                  }}
                >
                  {weekNavItems.map((item) => {
                    const isPlayoffs = item.id === 'playoffs';
                    // NEW: If we are in Season mode and the season hasn't started, lock it!
                    const isLocked = isPlayoffs && weeklyData && !weeklyData.hasWeekStarted;
                    
                    return (
                      <option 
                        key={item.id} 
                        value={item.id}
                        disabled={isLocked} 
                        style={{ color: isLocked ? '#475569' : '#f8fafc', background: '#131c2e' }} 
                      >
                        {isPlayoffs && isLocked ? 'PLAYOFFS 🔒' : item.label}
                      </option>
                    );
                  })}
                </select>
                
                {/* Custom Dropdown Arrow */}
                <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94a3b8', fontSize: '14px' }}>
                  ▼
                </div>
              </div>

              {/* RENDER PLAYOFF BRACKET IF "PLAYOFFS" TAB IS SELECTED IN SEASON MODE */}
              {isSeasonMode && selectedWeek === 'playoffs' ? (
                <div>
                  <div style={{ marginBottom: '20px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', letterSpacing: '0.1em', display: 'block', marginBottom: '8px' }}>
                      SELECT PLAYER BRACKET
                    </span>
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                      {leagueData.standings?.map((member) => {
                        const isSelected = bracketPlayerId === member.userId;
                        const isMe = member.userId === user.id;
                        return (
                          <button
                            key={member.userId}
                            onClick={() => setBracketPlayerId(member.userId)}
                            style={{
                              flex: '0 0 auto',
                              padding: '8px 16px',
                              borderRadius: '8px',
                              border: isSelected ? '1px solid #f59e0b' : '1px solid #1e293b',
                              background: isSelected ? 'rgba(245, 158, 11, 0.15)' : '#0b0f19',
                              color: isSelected ? '#f59e0b' : '#94a3b8',
                              fontWeight: '700',
                              fontSize: '13px',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            {member.username} {isMe && '(You)'}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {bracketLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading bracket prediction...</div>
                  ) : (
                    <PlayoffBracket
                      regularSeasonPicks={bracketPicksMap}
                      games={games}
                      playoffPicks={bracketPicksMap}
                      readOnly={true}
                    />
                  )}
                </div>
              ) : (
                /* REGULAR SEASON WEEK VIEW */
                weeklyData && (
                  weeklyData.error ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', border: '1px dashed #334155' }}>
                      <div style={{ fontSize: '28px', marginBottom: '8px' }}>⏳</div>
                      <h3 style={{ margin: 0, fontFamily: 'Teko, sans-serif', fontSize: '28px', letterSpacing: '1px' }}>MATCHUPS TBD</h3>
                      <p style={{ margin: '4px 0 0', fontSize: '14px' }}>{weeklyData.error}</p>
                    </div>
                  ) : !weeklyData.hasWeekStarted ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                      <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔒</div>
                      <h3 style={{ margin: 0, fontFamily: 'Teko, sans-serif', fontSize: '28px', letterSpacing: '1px' }}>PICKS ARE HIDDEN</h3>
                      
                      {/* UPDATED: Dynamic text based on league mode */}
                      <p style={{ margin: '4px 0 0', fontSize: '14px' }}>
                        {isSeasonMode 
                          ? "You cannot view other players' picks until the first game of the season officially kicks off." 
                          : `You cannot view other players' picks until the first game of Week ${selectedWeek} officially kicks off.`}
                      </p>

                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr>
                            <th style={{ padding: '16px', fontSize: '11px', fontWeight: '800', color: '#64748b', letterSpacing: '0.1em', borderBottom: '1px solid #1e293b' }}>RANK</th>
                            <th style={{ padding: '16px', fontSize: '11px', fontWeight: '800', color: '#64748b', letterSpacing: '0.1em', borderBottom: '1px solid #1e293b' }}>PLAYER</th>
                            <th style={{ padding: '16px', fontSize: '11px', fontWeight: '800', color: '#64748b', letterSpacing: '0.1em', borderBottom: '1px solid #1e293b', textAlign: 'right' }}>WEEK SCORE</th>
                          </tr>
                        </thead>
                        <tbody>
                          {weeklyData.usersPicks?.map((u, idx) => {
                            const isExpanded = expandedUserId === u.userId;
                            return (
                              <React.Fragment key={u.userId}>
                                <tr
                                  onClick={() => toggleUserExpanded(u.userId)}
                                  style={{
                                    cursor: 'pointer',
                                    background: isExpanded ? '#1e293b' : 'transparent',
                                    borderBottom: isExpanded ? 'none' : '1px solid #1e293b',
                                    transition: 'background 0.2s'
                                  }}
                                >
                                  <td style={{ padding: '16px', fontWeight: 'bold', color: '#94a3b8' }}>
                                    {u.rank}
                                  </td>
                                  <td style={{ padding: '16px', fontWeight: 'bold', color: u.userId === user.id ? '#38bdf8' : '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {u.username} {u.userId === user.id && <span style={{ fontSize: '11px', opacity: 0.7 }}>(YOU)</span>}
                                    <span style={{ fontSize: '12px', color: '#475569' }}>{isExpanded ? '▼' : '▶'}</span>
                                  </td>
                                  <td style={{ padding: '16px', textAlign: 'right', fontFamily: 'Teko, sans-serif', fontSize: '24px', fontWeight: '600', color: '#e2e8f0' }}>
                                    {u.weeklyPoints}
                                  </td>
                                </tr>

                                {isExpanded && (
                                  <tr style={{ borderBottom: '1px solid #1e293b', background: '#0b0f19' }}>
                                    <td colSpan="3" style={{ padding: '20px 16px' }}>
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                                        {weeklyData.games?.map((g) => {
                                          const pick = u.picks ? u.picks[g.gameId] : undefined;
                                          const isFinal = g.status === 'final';
                                          const isCorrect = isFinal && g.winner === pick;
                                          const isWrong = isFinal && g.winner !== pick && g.winner !== 'tie';

                                          const awayTheme = getTeamTheme(g.awayTeam);
                                          const homeTheme = getTeamTheme(g.homeTeam);
                                          const isAwayPicked = pick === g.awayTeam;
                                          const isHomePicked = pick === g.homeTeam;

                                          return (
                                            <div
                                              key={g.gameId}
                                              style={{
                                                background: '#131c2e',
                                                border: `1px solid ${isCorrect ? '#22c55e' : isWrong ? '#ef4444' : '#334155'}`,
                                                borderRadius: '10px',
                                                padding: '12px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '10px',
                                                boxShadow: isCorrect ? '0 0 10px rgba(34, 197, 94, 0.1)' : 'none'
                                              }}
                                            >
                                              <div style={{ fontSize: '10px', color: '#64748b', display: 'flex', justifyContent: 'space-between', fontWeight: '800', letterSpacing: '0.05em' }}>
                                                <span>GAME {g.gameId}</span>
                                                {isFinal ? (
                                                  <span style={{ color: isCorrect ? '#4ade80' : isWrong ? '#f87171' : '#94a3b8' }}>
                                                    {isCorrect ? 'WIN' : isWrong ? 'LOSS' : 'TIE'}
                                                  </span>
                                                ) : (
                                                  <span>PENDING</span>
                                                )}
                                              </div>

                                              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '8px' }}>
                                                {/* Away Team */}
                                                <div
                                                  style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    padding: '8px 4px',
                                                    borderRadius: '6px',
                                                    border: isAwayPicked ? `1px solid ${awayTheme.primary}` : '1px solid #1e293b',
                                                    background: isAwayPicked ? awayTheme.primary : '#0b0f19',
                                                    color: isAwayPicked ? awayTheme.text : '#f8fafc',
                                                    opacity: pick === 'HIDDEN' || isAwayPicked ? 1 : 0.4
                                                  }}
                                                >
                                                  <img
                                                    src={awayTheme.logoUrl}
                                                    alt={g.awayTeam}
                                                    style={{
                                                      width: '24px',
                                                      height: '24px',
                                                      objectFit: 'contain',
                                                      filter: isAwayPicked ? 'drop-shadow(0px 0px 6px rgba(255, 255, 255, 0.6))' : 'none'
                                                    }}
                                                  />
                                                  <span style={{ fontSize: '12px', fontFamily: 'Teko, sans-serif', letterSpacing: '0.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'center' }}>
                                                    {g.awayTeam}
                                                  </span>
                                                </div>

                                                <div style={{ fontSize: '12px', fontWeight: '900', color: '#475569', fontFamily: 'Teko, sans-serif' }}>
                                                  VS
                                                </div>

                                                {/* Home Team */}
                                                <div
                                                  style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    padding: '8px 4px',
                                                    borderRadius: '6px',
                                                    border: isHomePicked ? `1px solid ${homeTheme.primary}` : '1px solid #1e293b',
                                                    background: isHomePicked ? homeTheme.primary : '#0b0f19',
                                                    color: isHomePicked ? homeTheme.text : '#f8fafc',
                                                    opacity: pick === 'HIDDEN' || isHomePicked ? 1 : 0.4
                                                  }}
                                                >
                                                  <img
                                                    src={homeTheme.logoUrl}
                                                    alt={g.homeTeam}
                                                    style={{
                                                      width: '24px',
                                                      height: '24px',
                                                      objectFit: 'contain',
                                                      filter: isHomePicked ? 'drop-shadow(0px 0px 6px rgba(255, 255, 255, 0.6))' : 'none'
                                                    }}
                                                  />
                                                  <span style={{ fontSize: '12px', fontFamily: 'Teko, sans-serif', letterSpacing: '0.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'center' }}>
                                                    {g.homeTeam}
                                                  </span>
                                                </div>
                                              </div>

                                              {pick === 'HIDDEN' && (
                                                <div style={{ textAlign: 'center', fontSize: '10px', fontWeight: 'bold', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '4px', borderRadius: '4px' }}>
                                                  🔒 PICK HIDDEN
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )
                )
              )}
            </>
          )}
        </div>

        {/* Leave League Danger Zone */}
        <div style={{ padding: '24px', borderTop: '1px solid #1e293b', textAlign: 'center' }}>
          <button
            onClick={handleLeaveLeague}
            disabled={leaving}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '8px',
              border: '1px solid #ef4444',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              fontWeight: '800',
              fontFamily: 'Teko, sans-serif',
              fontSize: '20px',
              letterSpacing: '1px',
              cursor: leaving ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {leaving ? 'LEAVING LEAGUE...' : 'LEAVE THIS LEAGUE'}
          </button>
        </div>
      </div>
    </div>
  );
}