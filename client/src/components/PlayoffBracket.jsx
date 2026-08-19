import React, { useMemo } from 'react';
import { nflDictionary } from '../utils/nflDictionary';
import { rankTeams } from '../utils/tiebreakers';
import { getTeamTheme } from '../teamTheme';

export default function PlayoffBracket({ 
  regularSeasonPicks = {}, 
  games = [], 
  playoffPicks = {}, 
  onSelectPlayoffTeam, 
  readOnly = false 
}) {

  // 1. Calculate simulated regular season W-L-T records
  const teamStandings = useMemo(() => {
    const records = {};
    
    Object.keys(nflDictionary).forEach(abbr => {
      records[abbr] = {
        abbr,
        name: nflDictionary[abbr].name,
        conference: nflDictionary[abbr].conference,
        division: nflDictionary[abbr].division,
        wins: 0, losses: 0, ties: 0
      };
    });

    const getAbbr = (teamStr) => {
      if (!teamStr) return null;
      const search = teamStr.toString().toLowerCase().trim();
      for (const abbr in nflDictionary) {
        if (abbr.toLowerCase() === search) return abbr;
        if (nflDictionary[abbr].name.toLowerCase() === search) return abbr;
        if (nflDictionary[abbr].name.toLowerCase().includes(search)) return abbr;
      }
      return teamStr; 
    };

    games.forEach(game => {
      if (game.gameId.startsWith('WC_') || game.gameId.startsWith('DIV_') || game.gameId.startsWith('CONF_') || game.gameId.startsWith('SB_')) {
        return;
      }

      const pickedWinner = regularSeasonPicks[game.gameId];
      if (pickedWinner) {
        const homeAbbr = getAbbr(game.homeTeam);
        const awayAbbr = getAbbr(game.awayTeam);
        const isHomeWinner = pickedWinner === game.homeTeam || pickedWinner === homeAbbr;

        if (isHomeWinner) {
          if (records[homeAbbr]) records[homeAbbr].wins++;
          if (records[awayAbbr]) records[awayAbbr].losses++;
        } else {
          if (records[awayAbbr]) records[awayAbbr].wins++;
          if (records[homeAbbr]) records[homeAbbr].losses++;
        }
      }
    });

    return Object.values(records);
  }, [regularSeasonPicks, games]);

  // 2. Generate Fixed 1-7 Seeds for AFC and NFC
  const seeds = useMemo(() => {
    const getSeedsForConference = (conf) => {
      const confTeams = teamStandings.filter(t => t.conference === conf);
      const divisions = ['East', 'North', 'South', 'West'];

      const divWinners = divisions.map(div => {
        const divTeams = confTeams.filter(t => t.division === div);
        return rankTeams(divTeams, games, regularSeasonPicks)[0];
      }).filter(Boolean);

      const rankedDivWinners = rankTeams(divWinners, games, regularSeasonPicks);
      const divWinnerAbbrs = new Set(rankedDivWinners.map(dw => dw.abbr));
      const nonDivWinners = confTeams.filter(t => !divWinnerAbbrs.has(t.abbr));
      const rankedWildCards = rankTeams(nonDivWinners, games, regularSeasonPicks).slice(0, 3);

      return [...rankedDivWinners, ...rankedWildCards].map((team, idx) => ({
        ...team,
        seed: idx + 1
      }));
    };

    return {
      AFC: getSeedsForConference('AFC'),
      NFC: getSeedsForConference('NFC')
    };
  }, [teamStandings, games, regularSeasonPicks]);

  // 3. Dynamic Matchups Calculation
  const getPlayoffMatchups = (conf) => {
    const confSeeds = seeds[conf] || [];
    if (confSeeds.length < 7) return null;

    const [s1, s2, s3, s4, s5, s6, s7] = confSeeds;
    const findTeam = (pickVal) => confSeeds.find(s => s.name === pickVal || s.abbr === pickVal) || null;

    // Wild Card
    const wc1Winner = playoffPicks[`WC_${conf}_2v7`];
    const wc2Winner = playoffPicks[`WC_${conf}_3v6`];
    const wc3Winner = playoffPicks[`WC_${conf}_4v5`];

    const wcAdvancing = [
      findTeam(wc1Winner),
      findTeam(wc2Winner),
      findTeam(wc3Winner)
    ].filter(Boolean).sort((a, b) => a.seed - b.seed);

    const allWcDone = Boolean(wc1Winner && wc2Winner && wc3Winner && wcAdvancing.length === 3);

    // Divisional
    const divGame1 = { high: s1, low: allWcDone ? wcAdvancing[2] : null, id: `DIV_${conf}_G1`, label: 'Lowest Remaining' };
    const divGame2 = { high: allWcDone ? wcAdvancing[0] : null, low: allWcDone ? wcAdvancing[1] : null, id: `DIV_${conf}_G2`, label: 'Divisional Round' };

    const div1Winner = playoffPicks[divGame1.id];
    const div2Winner = playoffPicks[divGame2.id];

    const validDiv1Winner = (div1Winner === divGame1.high?.name || div1Winner === divGame1.low?.name) ? findTeam(div1Winner) : null;
    const validDiv2Winner = (div2Winner === divGame2.high?.name || div2Winner === divGame2.low?.name) ? findTeam(div2Winner) : null;

    const confChampAdvancing = [validDiv1Winner, validDiv2Winner].filter(Boolean).sort((a, b) => a.seed - b.seed);
    const allDivDone = Boolean(allWcDone && validDiv1Winner && validDiv2Winner);

    // Conference Championship
    const confGame = {
      high: allDivDone ? confChampAdvancing[0] : null,
      low: allDivDone ? confChampAdvancing[1] : null,
      id: `CONF_${conf}`,
      label: `${conf} Championship`
    };

    const confWinner = playoffPicks[confGame.id];
    const validConfWinner = (confWinner === confGame.high?.name || confWinner === confGame.low?.name) ? findTeam(confWinner) : null;

    return {
      wc: [
        { high: s2, low: s7, id: `WC_${conf}_2v7`, label: '#2 vs #7 Seed' },
        { high: s3, low: s6, id: `WC_${conf}_3v6`, label: '#3 vs #6 Seed' },
        { high: s4, low: s5, id: `WC_${conf}_4v5`, label: '#4 vs #5 Seed' }
      ],
      div: [divGame1, divGame2],
      conf: confGame,
      champ: validConfWinner
    };
  };

  // 4. Group & Sort Final Division Standings for the UI
  const divisionStandings = useMemo(() => {
    const standings = { AFC: {}, NFC: {} };
    const conferences = ['AFC', 'NFC'];
    const divisions = ['East', 'North', 'South', 'West'];

    conferences.forEach(conf => {
      divisions.forEach(div => {
        const divTeams = teamStandings.filter(t => t.conference === conf && t.division === div);
        standings[conf][div] = rankTeams(divTeams, games, regularSeasonPicks);
      });
    });

    return standings;
  }, [teamStandings, games, regularSeasonPicks]);

  const afcTree = getPlayoffMatchups('AFC');
  const nfcTree = getPlayoffMatchups('NFC');

  const superBowlMatchup = {
    afc: afcTree?.champ || null,
    nfc: nfcTree?.champ || null,
    id: 'SB_CHAMPIONSHIP'
  };

  const sbWinner = playoffPicks['SB_CHAMPIONSHIP'];
  const worldChampion = [superBowlMatchup.afc, superBowlMatchup.nfc].find(
    t => t && (t.name === sbWinner || t.abbr === sbWinner)
  );

  const renderTeamSlot = (team, gameId, isTop = false) => {
    if (!team) {
      return (
        <div style={{ ...styles.teamSlot, ...styles.tbdSlot, borderTopLeftRadius: isTop ? '8px' : '0', borderTopRightRadius: isTop ? '8px' : '0', borderBottomLeftRadius: !isTop ? '8px' : '0', borderBottomRightRadius: !isTop ? '8px' : '0' }}>
          <span style={{ fontSize: '11px', color: '#475569', fontWeight: '800' }}>TBD</span>
        </div>
      );
    }

    const theme = getTeamTheme(team.name);
    const isSelected = playoffPicks[gameId] === team.name || playoffPicks[gameId] === team.abbr;

    return (
      <button
        type="button"
        disabled={readOnly}
        onClick={() => !readOnly && onSelectPlayoffTeam && onSelectPlayoffTeam(gameId, team.name)}
        style={{
          ...styles.teamSlot,
          borderTopLeftRadius: isTop ? '8px' : '0',
          borderTopRightRadius: isTop ? '8px' : '0',
          borderBottomLeftRadius: !isTop ? '8px' : '0',
          borderBottomRightRadius: !isTop ? '8px' : '0',
          borderLeft: isSelected ? `4px solid ${theme.primary}` : '4px solid transparent',
          background: isSelected ? theme.primary : '#0b0f19',
          color: isSelected ? theme.text : '#f8fafc',
          cursor: readOnly ? 'default' : 'pointer',
          boxShadow: isSelected ? `0 0 14px ${theme.primary}50` : 'none',
          transition: 'all 0.15s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <span style={{ ...styles.seedTag, background: isSelected ? 'rgba(0,0,0,0.3)' : '#1e293b', color: isSelected ? '#ffffff' : '#94a3b8' }}>
            #{team.seed}
          </span>
          <img 
            src={theme.logoUrl} 
            alt={team.abbr} 
            style={{ 
              width: '20px', 
              height: '20px', 
              objectFit: 'contain',
              filter: isSelected ? 'drop-shadow(0px 0px 6px rgba(255, 255, 255, 0.7))' : 'none'
            }} 
          />
          <span style={{ fontFamily: 'Teko, sans-serif', fontSize: '18px', letterSpacing: '0.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {team.abbr}
          </span>
        </div>
      </button>
    );
  };

  const renderBracketMatchup = (game, points) => {
    return (
      <div style={styles.matchupBlock}>
        <div style={styles.matchupHeader}>
          <span>{game.label}</span>
          <span style={styles.ptsBadge}>+{points} PTS</span>
        </div>
        <div style={styles.matchupBox}>
          {renderTeamSlot(game.high, game.id, true)}
          <div style={styles.slotDivider} />
          {renderTeamSlot(game.low, game.id, false)}
        </div>
      </div>
    );
  };

  return (
    <div style={styles.bracketContainer}>
      
      {/* Overview Banner */}
      <div style={styles.podiumBanner}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '28px' }}>🏆</span>
          <div>
            <div style={{ fontFamily: 'Teko, sans-serif', fontSize: '26px', lineHeight: '1', color: '#f8fafc', letterSpacing: '1px' }}>
              PLAYOFF BRACKET
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              Seeding determined by your regular season predictions.
            </div>
          </div>
        </div>

        {worldChampion && (
          <div style={styles.championBadge}>
            <span style={{ fontSize: '10px', color: '#fbbf24', fontWeight: '800', letterSpacing: '1px' }}>CHAMPION</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              <img src={getTeamTheme(worldChampion.name).logoUrl} alt={worldChampion.abbr} style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
              <span style={{ fontFamily: 'Teko, sans-serif', fontSize: '20px', color: '#ffffff' }}>{worldChampion.name.toUpperCase()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Symmetrical Bracket Canvas */}
      <div style={styles.canvasScrollWrapper}>
        <div style={styles.bracketCanvas}>
          
          {/* ================= AFC SIDE (Left) ================= */}
          <div style={styles.roundColumn}>
            <div style={{ ...styles.columnHeader, color: '#ef4444' }}>AFC WILD CARD</div>
            <div style={{ ...styles.columnMatches, justifyContent: 'space-around' }}>
              {afcTree?.wc.map(g => (
                <div key={g.id} style={styles.gameWrapper}>{renderBracketMatchup(g, 2)}</div>
              ))}
            </div>
          </div>

          <div style={styles.roundColumn}>
            <div style={{ ...styles.columnHeader, color: '#ef4444' }}>AFC DIVISIONAL</div>
            <div style={{ ...styles.columnMatches, justifyContent: 'space-around' }}>
              {afcTree?.div.map(g => (
                <div key={g.id} style={styles.gameWrapper}>{renderBracketMatchup(g, 3)}</div>
              ))}
            </div>
          </div>

          <div style={styles.roundColumn}>
            <div style={{ ...styles.columnHeader, color: '#ef4444' }}>AFC CHAMPIONSHIP</div>
            <div style={{ ...styles.columnMatches, justifyContent: 'center' }}>
              {afcTree && (
                <div style={styles.gameWrapper}>{renderBracketMatchup(afcTree.conf, 4)}</div>
              )}
            </div>
          </div>

          {/* ================= CENTER: SUPER BOWL ================= */}
          <div style={styles.superBowlCenterColumn}>
            <div style={styles.sbArenaBox}>
              <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '26px' }}>🏈</span>
                <div style={{ fontFamily: 'Teko, sans-serif', fontSize: '24px', color: '#f59e0b', letterSpacing: '1px', lineHeight: '1' }}>
                  SUPER BOWL
                </div>
                <span style={{ ...styles.ptsBadge, background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', marginTop: '4px', display: 'inline-block' }}>
                  +10 PTS
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                <div style={styles.sbTeamSlotWrapper}>
                  <span style={styles.conferenceMiniLabel}>AFC CHAMPION</span>
                  {renderTeamSlot(superBowlMatchup.afc, superBowlMatchup.id, true)}
                </div>

                <div style={{ textAlign: 'center', fontFamily: 'Teko, sans-serif', fontSize: '16px', color: '#64748b', fontWeight: 'bold' }}>
                  VS
                </div>

                <div style={styles.sbTeamSlotWrapper}>
                  <span style={styles.conferenceMiniLabel}>NFC CHAMPION</span>
                  {renderTeamSlot(superBowlMatchup.nfc, superBowlMatchup.id, false)}
                </div>
              </div>
            </div>
          </div>

          {/* ================= NFC SIDE (Right) ================= */}
          <div style={styles.roundColumn}>
            <div style={{ ...styles.columnHeader, color: '#38bdf8' }}>NFC CHAMPIONSHIP</div>
            <div style={{ ...styles.columnMatches, justifyContent: 'center' }}>
              {nfcTree && (
                <div style={styles.gameWrapper}>{renderBracketMatchup(nfcTree.conf, 4)}</div>
              )}
            </div>
          </div>

          <div style={styles.roundColumn}>
            <div style={{ ...styles.columnHeader, color: '#38bdf8' }}>NFC DIVISIONAL</div>
            <div style={{ ...styles.columnMatches, justifyContent: 'space-around' }}>
              {nfcTree?.div.map(g => (
                <div key={g.id} style={styles.gameWrapper}>{renderBracketMatchup(g, 3)}</div>
              ))}
            </div>
          </div>

          <div style={styles.roundColumn}>
            <div style={{ ...styles.columnHeader, color: '#38bdf8' }}>NFC WILD CARD</div>
            <div style={{ ...styles.columnMatches, justifyContent: 'space-around' }}>
              {nfcTree?.wc.map(g => (
                <div key={g.id} style={styles.gameWrapper}>{renderBracketMatchup(g, 2)}</div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ==================================================
          SIMULATED DIVISION STANDINGS (Header removed)
          ================================================== */}
      <div style={styles.standingsContainer}>
        <div style={styles.conferencesWrapper}>
          {['AFC', 'NFC'].map(conf => (
            <div key={conf} style={styles.confStandingsBlock}>
              <div style={{ ...styles.confStandingsTitle, color: conf === 'AFC' ? '#ef4444' : '#38bdf8' }}>
                {conf} STANDINGS
              </div>
              <div style={styles.divisionsGrid}>
                {['East', 'North', 'South', 'West'].map(div => (
                  <div key={div} style={styles.divisionCard}>
                    <div style={styles.divisionName}>{div.toUpperCase()}</div>
                    <div style={styles.divisionTable}>
                      <div style={styles.divRowHeader}>
                        <span>TEAM</span>
                        <span>W-L-T</span>
                      </div>
                      {divisionStandings[conf][div].map((team, idx) => {
                         const theme = getTeamTheme(team.name);
                         return (
                           <div key={team.abbr} style={styles.divRow}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                               <span style={{ fontSize: '10px', color: '#64748b', width: '8px' }}>{idx + 1}</span>
                               <img src={theme.logoUrl} alt={team.abbr} style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                               <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#f8fafc' }}>{team.abbr}</span>
                             </div>
                             <span style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8' }}>
                               {team.wins}-{team.losses}{team.ties > 0 ? `-${team.ties}` : ''}
                             </span>
                           </div>
                         )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

const styles = {
  // FIXED: Returned to a safe 100% width so nothing gets sliced off by the app's wrapper
  bracketContainer: { 
    marginTop: '16px', 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '16px',
    width: '100%'
  },
  
  podiumBanner: { background: '#131c2e', border: '1px solid #1e293b', borderRadius: '14px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' },
  championBadge: { background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '10px', padding: '8px 16px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' },
  
  canvasScrollWrapper: { width: '100%', overflow: 'hidden', paddingBottom: '16px' },
  
  // FIXED: Switched to Flexbox for fluid distribution and tightened the gaps
  bracketCanvas: { 
    display: 'flex',
    justifyContent: 'space-between',
    gap: '6px', 
    width: '100%', 
    padding: '8px 0', 
    alignItems: 'stretch' 
  },
  
  // FIXED: Outer rounds get equal flex space, allowing them to shrink/grow gracefully
  roundColumn: { flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 },
  
  // FIXED: Allowed text to wrap (whiteSpace: 'normal') so "CHAMPIONSHIP" doesn't stretch the column
  columnHeader: { fontFamily: 'Teko, sans-serif', fontSize: '15px', fontWeight: '700', letterSpacing: '0.5px', textAlign: 'center', paddingBottom: '4px', borderBottom: '1px solid #1e293b', whiteSpace: 'normal', lineHeight: '1.1' },
  
  columnMatches: { display: 'flex', flexDirection: 'column', flex: 1, minHeight: '520px' },
  gameWrapper: { display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  
  // FIXED: Tightened the padding inside the match blocks to give the text more breathing room
  matchupBlock: { background: '#131c2e', border: '1px solid #1e293b', borderRadius: '8px', padding: '6px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)', minWidth: 0 },
  
  // FIXED: Allowed header text like "Lowest Remaining" to wrap instead of cutting off
  matchupHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px', color: '#64748b', fontWeight: '800', marginBottom: '4px', whiteSpace: 'normal', lineHeight: '1' },
  ptsBadge: { background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', padding: '2px 5px', borderRadius: '4px', fontSize: '9px', fontWeight: '800', whiteSpace: 'nowrap' },
  matchupBox: { display: 'flex', flexDirection: 'column', border: '1px solid #1e293b', borderRadius: '6px', overflow: 'hidden' },
  slotDivider: { height: '1px', background: '#1e293b' },
  
  teamSlot: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 4px', border: 'none', outline: 'none', background: '#0b0f19', minWidth: 0 },
  tbdSlot: { padding: '10px 8px', justifyContent: 'center', background: '#080c14' },
  seedTag: { padding: '1px 4px', borderRadius: '3px', fontSize: '10px', fontWeight: '800', marginRight: '2px' },
  
  // FIXED: The Super Bowl column gets slightly more flex space (1.3) than the other columns (1.0)
  superBowlCenterColumn: { flex: 1.3, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minWidth: 0 },
  sbArenaBox: { background: '#131c2e', border: '1px solid rgba(245, 158, 11, 0.4)', borderRadius: '14px', padding: '12px', width: '100%', boxShadow: '0 0 25px rgba(245, 158, 11, 0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  sbTeamSlotWrapper: { display: 'flex', flexDirection: 'column', gap: '4px', border: '1px solid #1e293b', borderRadius: '8px', padding: '6px', background: '#0b0f19', width: '100%' },
  conferenceMiniLabel: { fontSize: '9px', fontWeight: '800', color: '#64748b', letterSpacing: '0.05em' },

  standingsContainer: { marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' },
  conferencesWrapper: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' },
  confStandingsBlock: { display: 'flex', flexDirection: 'column', gap: '12px', background: '#0b0f19', padding: '16px', borderRadius: '12px', border: '1px solid #1e293b' },
  confStandingsTitle: { fontFamily: 'Teko, sans-serif', fontSize: '22px', letterSpacing: '1px', borderBottom: '1px solid #1e293b', paddingBottom: '8px', fontWeight: 'bold' },
  divisionsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' },
  divisionCard: { background: '#131c2e', border: '1px solid #1e293b', borderRadius: '10px', padding: '12px' },
  divisionName: { fontSize: '11px', fontWeight: '800', color: '#94a3b8', letterSpacing: '0.1em', marginBottom: '8px', textAlign: 'center' },
  divisionTable: { display: 'flex', flexDirection: 'column', gap: '4px' },
  divRowHeader: { display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#475569', fontWeight: '800', borderBottom: '1px solid #1e293b', paddingBottom: '4px', marginBottom: '2px' },
  divRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }
};