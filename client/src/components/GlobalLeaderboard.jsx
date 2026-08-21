import React, { useState, useEffect } from 'react';
import PlayoffBracket from './PlayoffBracket';
import { getTeamTheme } from '../teamTheme';

export default function GlobalLeaderboard({ currentUserId }) {
  const [activeTab, setActiveTab] = useState('season'); // 'season' | 'weekly'
  const [scopeTab, setScopeTab] = useState('global');   // 'global' | 'friends'
  
  const [data, setData] = useState({
    season: { top50: [], totalEntries: 0, userStats: null },
    weekly: { top50: [], totalEntries: 0, userStats: null }
  });
  const [loading, setLoading] = useState(true);

  // State for the Scouting Modal
  const [viewingSheet, setViewingSheet] = useState(null);
  const [sheetData, setSheetData] = useState(null);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [scoutWeek, setScoutWeek] = useState(1);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
      setLoading(true); // Trigger loading animation when swapping tabs
      
      // Append the active scopeTab to the API request
  const url = currentUserId
      ? `${API_BASE}/api/leaderboard/global?userId=${currentUserId}&scope=${scopeTab}`
      : `${API_BASE}/api/leaderboard/global?scope=${scopeTab}`;

      fetch(url)
        .then((res) => res.json())
        .then((resData) => {
          setData(resData);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Failed to load global leaderboards:', err);
          setLoading(false);
        });
    }, [currentUserId, scopeTab]);

  const currentModeData = activeTab === 'season' ? data.season : data.weekly;
  const { top50 = [], totalEntries = 0, userStats, userEntries = [] } = currentModeData || {};

  // Fetch public picks when a row is clicked
  const handleRowClick = async (sheetId) => {
    setViewingSheet(sheetId);
    setSheetLoading(true);
    setScoutWeek(1);
    try {
      const res = await fetch(`${API_BASE}/api/picks/public/sheet/${sheetId}`);
      const fetchedData = await res.json();
      setSheetData(fetchedData);
    } catch (err) {
      console.error('Failed to load sheet:', err);
    } finally {
      setSheetLoading(false);
    }
  };

  return (
    <div style={styles.card}>
      
      {/* Header (3-Column Layout) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        
        {/* LEFT COLUMN: Global vs Friends Toggle */}
        <div style={{ flex: '1 1 0', display: 'flex', justifyContent: 'flex-start' }}>
          <div style={styles.tabGroup}>
            <button
              onClick={() => setScopeTab('global')}
              style={{
                ...styles.tabBtn,
                background: scopeTab === 'global' ? '#a855f7' : 'transparent',
                color: scopeTab === 'global' ? '#f8fafc' : '#94a3b8'
              }}
            >
              GLOBAL
            </button>
            <button
              onClick={() => setScopeTab('friends')}
              style={{
                ...styles.tabBtn,
                background: scopeTab === 'friends' ? '#a855f7' : 'transparent',
                color: scopeTab === 'friends' ? '#f8fafc' : '#94a3b8'
              }}
            >
              FRIENDS
            </button>
          </div>
        </div>

        {/* CENTER COLUMN: Dynamic Title */}
        <div style={{ flex: '1 1 auto', textAlign: 'center' }}>
          <h3 style={styles.title}>
            {scopeTab === 'global' ? 'GLOBAL TOP 50' : 'FRIENDS LEADERBOARD'}
          </h3>
          <p style={styles.subtitle}>
            {scopeTab === 'global' 
              ? `(${totalEntries} total entries)` 
              : 'See how you stack up against your buddies'}
          </p>
        </div>

        {/* RIGHT COLUMN: Season vs Weekly Toggle */}
        <div style={{ flex: '1 1 0', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={styles.tabGroup}>
            <button
              onClick={() => setActiveTab('season')}
              style={{
                ...styles.tabBtn,
                background: activeTab === 'season' ? '#38bdf8' : 'transparent',
                color: activeTab === 'season' ? '#0b0f19' : '#94a3b8'
              }}
            >
              SEASON LOCK
            </button>
            <button
              onClick={() => setActiveTab('weekly')}
              style={{
                ...styles.tabBtn,
                background: activeTab === 'weekly' ? '#fbbf24' : 'transparent',
                color: activeTab === 'weekly' ? '#0b0f19' : '#94a3b8'
              }}
            >
              WEEKLY LOCK
            </button>
          </div>
        </div>
        
      </div>

      {/* Logged-In User Performance Banner */}
      {userStats ? (
        <div style={styles.userBanner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={styles.percentileBadge}>
              TOP {userStats.topPercentage}%
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '700' }}>
                YOUR BEST SHEET
              </div>
              <div style={{ fontSize: '14px', color: '#f8fafc', marginTop: '2px' }}>
                Rank <strong>#{userStats.rank}</strong> of {userStats.totalParticipants}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '800' }}>YOUR SCORE</div>
            <div style={{ fontFamily: 'Teko, sans-serif', fontSize: '32px', color: '#22c55e', lineHeight: 1 }}>
              {userStats.points} <span style={{ fontSize: '16px' }}>PTS</span>
            </div>
          </div>
        </div>
      ) : (
        <div style={styles.noUserBanner}>
          You haven't submitted any picks for {activeTab === 'season' ? 'Season Lock' : 'Weekly Lock'} leagues yet.
        </div>
      )}

      {/* Top 50 Leaderboard Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
          Loading rankings...
        </div>
      ) : top50.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
          No scores submitted yet.
        </div>
      ) : (
        <div style={{ overflowX: 'auto', maxHeight: '380px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1e293b', color: '#64748b', fontSize: '11px', letterSpacing: '0.1em' }}>
                <th style={{ padding: '12px 16px' }}>RANK</th>
                <th style={{ padding: '12px 16px' }}>PLAYER</th>
                <th style={{ padding: '12px 16px' }}>LEAGUE</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>POINTS</th>
              </tr>
            </thead>
            <tbody>
              {/* 1. PINNED USER ENTRIES (Sorted by Rank) */}
              {userEntries && userEntries.map((entry) => {
                const isTop3 = entry.rank <= 3;
                return (
                  <tr
                    key={`pinned-${entry.sheetId}`}
                    onClick={() => handleRowClick(entry.sheetId)}
                    style={{
                      borderBottom: '1px solid #22c55e',
                      background: 'rgba(34, 197, 94, 0.15)',
                      cursor: 'pointer'
                    }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          fontSize: '12px',
                          fontWeight: '800',
                          background: isTop3
                            ? activeTab === 'season' ? '#38bdf8' : '#fbbf24'
                            : '#1e293b',
                          color: isTop3 ? '#0b0f19' : '#94a3b8'
                        }}
                      >
                        {entry.rank}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: '700', color: '#22c55e' }}>
                      {entry.username} <span style={{ fontSize: '11px', opacity: 0.7 }}>(YOU)</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '13px' }}>
                      {entry.leagueName}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'Teko, sans-serif', fontSize: '24px', fontWeight: '700', color: '#f8fafc' }}>
                      {entry.points}
                    </td>
                  </tr>
                );
              })}

              {/* Visual Divider */}
              {userEntries && userEntries.length > 0 && (
                <tr style={{ background: '#0b0f19' }}>
                  <td colSpan="4" style={{ height: '8px', padding: 0 }}></td>
                </tr>
              )}

              {/* 2. REGULAR TOP 50 */}
              {top50.map((entry) => {
                const isMe = entry.userId === currentUserId;
                const isTop3 = entry.rank <= 3;
                
                return (
                  <tr
                    key={entry.sheetId}
                    onClick={() => handleRowClick(entry.sheetId)}
                    style={{
                      borderBottom: '1px solid #1e293b',
                      background: isMe ? 'rgba(34, 197, 94, 0.08)' : 'transparent',
                      cursor: 'pointer'
                    }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          fontSize: '12px',
                          fontWeight: '800',
                          background: isTop3
                            ? activeTab === 'season' ? '#38bdf8' : '#fbbf24'
                            : '#1e293b',
                          color: isTop3 ? '#0b0f19' : '#94a3b8'
                        }}
                      >
                        {entry.rank}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: isMe ? '700' : '500', color: isMe ? '#22c55e' : '#f8fafc' }}>
                      {entry.username} {isMe && <span style={{ fontSize: '11px', opacity: 0.7 }}>(YOU)</span>}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '13px' }}>
                      {isMe ? entry.leagueName : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'Teko, sans-serif', fontSize: '24px', fontWeight: '700', color: '#f8fafc' }}>
                      {entry.points}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* SCOUTING MODAL (Full-Screen Grid) */}
      {viewingSheet && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(11, 15, 25, 0.95)', backdropFilter: 'blur(6px)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '24px' }}>
          
          <div style={{ background: '#131c2e', border: '1px solid #1e293b', borderRadius: '16px', width: '100%', maxWidth: '1200px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '24px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div>
                 <h3 style={{ margin: 0, fontFamily: 'Teko, sans-serif', fontSize: '32px', color: '#f8fafc', letterSpacing: '1px' }}>
                   {sheetData?.username ? `${sheetData.username.toUpperCase()}'S PICKS` : 'LOADING...'}
                 </h3>
                 {sheetData && (
                   <p style={{ margin: 0, fontSize: '14px', color: '#38bdf8', fontWeight: 'bold' }}>
                     {sheetData.leagueName} • {sheetData.points} PTS
                   </p>
                 )}
               </div>
               <button 
                 onClick={() => { setViewingSheet(null); setSheetData(null); }} 
                 style={{ background: '#1f2937', border: 'none', color: '#f8fafc', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', transition: 'background 0.2s' }}
                 onMouseEnter={(e) => e.currentTarget.style.background = '#ef4444'}
                 onMouseLeave={(e) => e.currentTarget.style.background = '#1f2937'}
               >
                 ✕
               </button>
            </div>

            {/* Dropdown Filter */}
            {!sheetLoading && sheetData && (
              <div style={{ padding: '16px 24px', borderBottom: '1px solid #1e293b', background: '#0b0f19' }}>
                {(() => {
                  const isBracketLocked = sheetData.picks?.some(p => p.selectedTeam === 'HIDDEN');

                  return (
                    <select
                      value={scoutWeek}
                      onChange={(e) => setScoutWeek(e.target.value === 'playoffs' ? 'playoffs' : Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '1px solid #1e293b',
                        background: '#131c2e',
                        color: scoutWeek === 'playoffs' ? '#38bdf8' : '#22c55e',
                        fontFamily: 'Teko, sans-serif',
                        fontSize: '22px',
                        cursor: 'pointer',
                        outline: 'none',
                        letterSpacing: '1px',
                        fontWeight: '700'
                      }}
                    >
                      {Array.from({ length: 18 }, (_, i) => i + 1).map((weekNum) => (
                        <option key={weekNum} value={weekNum} style={{ background: '#131c2e', color: '#f8fafc' }}>
                          WEEK {weekNum}
                        </option>
                      ))}
                      <option 
                        value="playoffs" 
                        disabled={isBracketLocked} 
                        style={{ background: '#131c2e', color: isBracketLocked ? '#475569' : '#f8fafc' }}
                      >
                        PLAYOFFS {isBracketLocked ? '🔒' : '🏆'}
                      </option>
                    </select>
                  );
                })()}
              </div>
            )}

            {/* Filtered Picks Grid / Bracket */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
               {sheetLoading ? (
                 <div style={{ color: '#94a3b8', textAlign: 'center', padding: '60px', fontSize: '18px' }}>Loading board...</div>
               ) : scoutWeek === 'playoffs' ? (
                 
                 /* VISUAL PLAYOFF BRACKET */
                 <div style={{ background: '#0b0f19', borderRadius: '12px', padding: '16px', border: '1px solid #1e293b' }}>
                   <PlayoffBracket 
                     regularSeasonPicks={sheetData?.picks.reduce((acc, p) => ({ ...acc, [p.gameId]: p.selectedTeam }), {})}
                     playoffPicks={sheetData?.picks.reduce((acc, p) => ({ ...acc, [p.gameId]: p.selectedTeam }), {})}
                     games={sheetData?.picks || []}
                     readOnly={true}
                   />
                 </div>

               ) : (
                 /* UPGRADED GRID LAYOUT FOR WEEKS 1-18 */
                 <>
                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                     {sheetData?.picks
                       .filter(p => Number(p.week) === scoutWeek)
                       .map(p => {
                          const isFinal = p.status === 'final';
                          const isCorrect = isFinal && p.selectedTeam === p.winner;
                          const isWrong = isFinal && p.selectedTeam !== p.winner && p.winner !== 'tie';
                          
                          const awayTheme = getTeamTheme(p.awayTeam);
                          const homeTheme = getTeamTheme(p.homeTeam);
                          const isAwayPicked = p.selectedTeam === p.awayTeam;
                          const isHomePicked = p.selectedTeam === p.homeTeam;

                          return (
                            <div key={p.gameId} style={{ 
                              background: '#0b0f19',
                              border: `1px solid ${isCorrect ? '#22c55e' : isWrong ? '#ef4444' : '#1e293b'}`, 
                              borderRadius: '12px', 
                              padding: '16px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '12px',
                              boxShadow: isCorrect ? '0 0 12px rgba(34, 197, 94, 0.1)' : 'none'
                            }}>
                              
                              {/* Card Header */}
                              <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', justifyContent: 'space-between', fontWeight: '800', letterSpacing: '0.05em' }}>
                                <span>WEEK {p.week}</span>
                                {isFinal ? (
                                  <span style={{ color: isCorrect ? '#4ade80' : isWrong ? '#f87171' : '#94a3b8' }}>
                                    {isCorrect ? 'WIN' : isWrong ? 'LOSS' : 'TIE'}
                                  </span>
                                ) : (
                                  <span>PENDING</span>
                                )}
                              </div>

                              {/* Matchup Layout */}
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '8px' }}>
                                
                                <div style={{ 
                                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                                  padding: '10px 4px', borderRadius: '8px',
                                  border: isAwayPicked ? `1px solid ${awayTheme.primary}` : '1px solid #1e293b',
                                  background: isAwayPicked ? awayTheme.primary : '#131c2e',
                                  color: isAwayPicked ? awayTheme.text : '#f8fafc',
                                  opacity: p.selectedTeam === 'HIDDEN' || isAwayPicked ? 1 : 0.4
                                }}>
                                  <img src={awayTheme.logoUrl} alt={p.awayTeam} style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                                  <span style={{ fontSize: '14px', fontFamily: 'Teko, sans-serif', letterSpacing: '0.5px' }}>{p.awayTeam}</span>
                                </div>

                                <div style={{ fontSize: '14px', fontWeight: '900', color: '#475569', fontFamily: 'Teko, sans-serif' }}>VS</div>

                                <div style={{ 
                                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                                  padding: '10px 4px', borderRadius: '8px',
                                  border: isHomePicked ? `1px solid ${homeTheme.primary}` : '1px solid #1e293b',
                                  background: isHomePicked ? homeTheme.primary : '#131c2e',
                                  color: isHomePicked ? homeTheme.text : '#f8fafc',
                                  opacity: p.selectedTeam === 'HIDDEN' || isHomePicked ? 1 : 0.4
                                }}>
                                  <img src={homeTheme.logoUrl} alt={p.homeTeam} style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                                  <span style={{ fontSize: '14px', fontFamily: 'Teko, sans-serif', letterSpacing: '0.5px' }}>{p.homeTeam}</span>
                                </div>
                              </div>
                              
                              {/* Masked Indicator */}
                              {p.selectedTeam === 'HIDDEN' && (
                                <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: 'bold', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '6px', borderRadius: '6px' }}>
                                  🔒 PICK HIDDEN
                                </div>
                              )}
                            </div>
                          );
                       })}
                   </div>
                     
                   {/* Empty State */}
                   {sheetData?.picks?.filter(p => Number(p.week) === scoutWeek).length === 0 && (
                     <div style={{ textAlign: 'center', color: '#64748b', padding: '40px', fontSize: '16px' }}>
                       No picks found for Week {scoutWeek}.
                     </div>
                   )}
                 </>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} // <--- THIS BRACKET WAS MISSING!

const styles = {
  card: {
    background: '#131c2e',
    border: '1px solid #1e293b',
    borderRadius: '14px',
    padding: '20px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '12px'
  },
  title: {
    fontFamily: 'Teko, sans-serif',
    fontSize: '26px',
    margin: 0,
    letterSpacing: '0.5px',
    color: '#f8fafc'
  },
  subtitle: {
    fontSize: '12px',
    color: '#64748b',
    margin: '2px 0 0'
  },
  tabGroup: {
    display: 'flex',
    background: '#0b0f19',
    borderRadius: '8px',
    padding: '4px',
    border: '1px solid #1e293b'
  },
  tabBtn: {
    border: 'none',
    padding: '6px 14px',
    borderRadius: '6px',
    fontFamily: 'Teko, sans-serif',
    fontSize: '16px',
    letterSpacing: '0.5px',
    cursor: 'pointer',
    fontWeight: '700',
    transition: 'all 0.2s'
  },
  userBanner: {
    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(15, 23, 42, 0.6) 100%)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
    borderRadius: '10px',
    padding: '14px 18px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  percentileBadge: {
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    color: '#0b0f19',
    fontFamily: 'Teko, sans-serif',
    fontSize: '22px',
    fontWeight: '800',
    padding: '4px 10px',
    borderRadius: '6px',
    letterSpacing: '0.5px',
    lineHeight: 1
  },
  noUserBanner: {
    background: '#0b0f19',
    border: '1px dashed #1e293b',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '13px',
    color: '#64748b',
    textAlign: 'center',
    marginBottom: '16px'
  }
};