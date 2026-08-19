import { nflDictionary } from './nflDictionary';

// Calculate Win Percentage (Ties count as a half-win)
export const getWinPct = (wins, losses, ties = 0) => {
  const totalGames = wins + losses + ties;
  if (totalGames === 0) return 0;
  return (wins + (ties * 0.5)) / totalGames;
};

// Helper to standardize names for comparison
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

// Authentic NFL Sorting Function
export const rankTeams = (teams = [], games = [], picks = {}) => {
  return [...teams].sort((teamA, teamB) => {
    
    // 1. OVERALL WIN PERCENTAGE
    const pctA = getWinPct(teamA.wins, teamA.losses, teamA.ties);
    const pctB = getWinPct(teamB.wins, teamB.losses, teamB.ties);

    if (pctA !== pctB) {
      return pctB - pctA; // Higher win percentage ranks higher
    }

    // --- NFL TIEBREAKER 1: HEAD-TO-HEAD ---
    const h2hGames = games.filter(g =>
      (getAbbr(g.homeTeam) === teamA.abbr && getAbbr(g.awayTeam) === teamB.abbr) ||
      (getAbbr(g.homeTeam) === teamB.abbr && getAbbr(g.awayTeam) === teamA.abbr)
    );

    if (h2hGames.length > 0) {
      let aWins = 0, bWins = 0;
      h2hGames.forEach(g => {
        const pick = picks[g.gameId];
        if (pick) {
          const pickedAbbr = getAbbr(pick);
          if (pickedAbbr === teamA.abbr) aWins++;
          if (pickedAbbr === teamB.abbr) bWins++;
        }
      });
      if (aWins > bWins) return -1;
      if (bWins > aWins) return 1;
    }

    // --- NFL TIEBREAKER 2: CONFERENCE RECORD ---
    if (teamA.conference === teamB.conference) {
      const getConfWins = (teamAbbr, conf) => {
        let wins = 0;
        games.forEach(g => {
          // Ignore playoff games in tiebreakers
          if (g.gameId.startsWith('WC_') || g.gameId.startsWith('DIV_') || g.gameId.startsWith('CONF_') || g.gameId.startsWith('SB_')) return;

          const homeAbbr = getAbbr(g.homeTeam);
          const awayAbbr = getAbbr(g.awayTeam);
          const pick = picks[g.gameId];

          if (pick) {
            const pickedAbbr = getAbbr(pick);
            if (pickedAbbr === teamAbbr) {
              const oppAbbr = (homeAbbr === teamAbbr) ? awayAbbr : homeAbbr;
              if (nflDictionary[oppAbbr]?.conference === conf) {
                wins++;
              }
            }
          }
        });
        return wins;
      };

      const aConfWins = getConfWins(teamA.abbr, teamA.conference);
      const bConfWins = getConfWins(teamB.abbr, teamB.conference);

      if (aConfWins !== bConfWins) {
        return bConfWins - aConfWins;
      }
    }

    // --- NFL FINAL TIEBREAKER: THE COIN TOSS ---
    // The literal final tiebreaker in the NFL rulebook is a Coin Toss.
    // We simulate a "fixed" coin toss by comparing their abbreviations.
    // This ensures the result stays mathematically consistent across React renders!
    return teamA.abbr.localeCompare(teamB.abbr);
  });
};