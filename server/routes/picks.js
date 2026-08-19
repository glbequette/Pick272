const express = require('express');
const router = express.Router();
const PickSheet = require('../models/PickSheet');
const League = require('../models/League');
const Game = require('../models/Game');

// 32-Team NFL Dictionary
const nflDictionary = {
  "ARI": { name: "Arizona Cardinals", conference: "NFC", division: "West" },
  "ATL": { name: "Atlanta Falcons", conference: "NFC", division: "South" },
  "BAL": { name: "Baltimore Ravens", conference: "AFC", division: "North" },
  "BUF": { name: "Buffalo Bills", conference: "AFC", division: "East" },
  "CAR": { name: "Carolina Panthers", conference: "NFC", division: "South" },
  "CHI": { name: "Chicago Bears", conference: "NFC", division: "North" },
  "CIN": { name: "Cincinnati Bengals", conference: "AFC", division: "North" },
  "CLE": { name: "Cleveland Browns", conference: "AFC", division: "North" },
  "DAL": { name: "Dallas Cowboys", conference: "NFC", division: "East" },
  "DEN": { name: "Denver Broncos", conference: "AFC", division: "West" },
  "DET": { name: "Detroit Lions", conference: "NFC", division: "North" },
  "GB":  { name: "Green Bay Packers", conference: "NFC", division: "North" },
  "HOU": { name: "Houston Texans", conference: "AFC", division: "South" },
  "IND": { name: "Indianapolis Colts", conference: "AFC", division: "South" },
  "JAX": { name: "Jacksonville Jaguars", conference: "AFC", division: "South" },
  "KC":  { name: "Kansas City Chiefs", conference: "AFC", division: "West" },
  "LV":  { name: "Las Vegas Raiders", conference: "AFC", division: "West" },
  "LAC": { name: "Los Angeles Chargers", conference: "AFC", division: "West" },
  "LAR": { name: "Los Angeles Rams", conference: "NFC", division: "West" },
  "MIA": { name: "Miami Dolphins", conference: "AFC", division: "East" },
  "MIN": { name: "Minnesota Vikings", conference: "NFC", division: "North" },
  "NE":  { name: "New England Patriots", conference: "AFC", division: "East" },
  "NO":  { name: "New Orleans Saints", conference: "NFC", division: "South" },
  "NYG": { name: "New York Giants", conference: "NFC", division: "East" },
  "NYJ": { name: "New York Jets", conference: "AFC", division: "East" },
  "PHI": { name: "Philadelphia Eagles", conference: "NFC", division: "East" },
  "PIT": { name: "Pittsburgh Steelers", conference: "AFC", division: "North" },
  "SF":  { name: "San Francisco 49ers", conference: "NFC", division: "West" },
  "SEA": { name: "Seattle Seahawks", conference: "NFC", division: "West" },
  "TB":  { name: "Tampa Bay Buccaneers", conference: "NFC", division: "South" },
  "TEN": { name: "Tennessee Titans", conference: "AFC", division: "South" },
  "WAS": { name: "Washington Commanders", conference: "NFC", division: "East" }
};

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

const getWinPct = (wins, losses, ties = 0) => {
  const total = wins + losses + ties;
  return total === 0 ? 0 : (wins + (ties * 0.5)) / total;
};

const rankTeams = (teams = [], games = [], picksMap = {}) => {
  return [...teams].sort((teamA, teamB) => {
    const pctA = getWinPct(teamA.wins, teamA.losses, teamA.ties);
    const pctB = getWinPct(teamB.wins, teamB.losses, teamB.ties);
    if (pctA !== pctB) return pctB - pctA;

    // H2H
    const h2h = games.filter(g =>
      (getAbbr(g.homeTeam) === teamA.abbr && getAbbr(g.awayTeam) === teamB.abbr) ||
      (getAbbr(g.homeTeam) === teamB.abbr && getAbbr(g.awayTeam) === teamA.abbr)
    );
    if (h2h.length > 0) {
      let aWins = 0, bWins = 0;
      h2h.forEach(g => {
        const pick = picksMap[g.gameId];
        if (pick) {
          const pickedAbbr = getAbbr(pick);
          if (pickedAbbr === teamA.abbr) aWins++;
          if (pickedAbbr === teamB.abbr) bWins++;
        }
      });
      if (aWins > bWins) return -1;
      if (bWins > aWins) return 1;
    }

    // Conference Record
    if (teamA.conference === teamB.conference) {
      const getConfWins = (teamAbbr, conf) => {
        let wins = 0;
        games.forEach(g => {
          if (g.gameId.startsWith('WC_') || g.gameId.startsWith('DIV_') || g.gameId.startsWith('CONF_') || g.gameId.startsWith('SB_')) return;
          const homeAbbr = getAbbr(g.homeTeam);
          const awayAbbr = getAbbr(g.awayTeam);
          const pick = picksMap[g.gameId];
          if (pick && getAbbr(pick) === teamAbbr) {
            const oppAbbr = (homeAbbr === teamAbbr) ? awayAbbr : homeAbbr;
            if (nflDictionary[oppAbbr]?.conference === conf) wins++;
          }
        });
        return wins;
      };
      const aConfWins = getConfWins(teamA.abbr, teamA.conference);
      const bConfWins = getConfWins(teamB.abbr, teamB.conference);
      if (aConfWins !== bConfWins) return bConfWins - aConfWins;
    }

    return teamA.abbr.localeCompare(teamB.abbr);
  });
};

const computeUserSeeds = (picksMap, regularSeasonGames) => {
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

  regularSeasonGames.forEach(game => {
    if (game.gameId.startsWith('WC_') || game.gameId.startsWith('DIV_') || game.gameId.startsWith('CONF_') || game.gameId.startsWith('SB_')) return;
    const pickedWinner = picksMap[game.gameId];
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

  const allTeams = Object.values(records);
  const getSeedsForConf = (conf) => {
    const confTeams = allTeams.filter(t => t.conference === conf);
    const divisions = ['East', 'North', 'South', 'West'];

    const divWinners = divisions.map(div => {
      const divTeams = confTeams.filter(t => t.division === div);
      return rankTeams(divTeams, regularSeasonGames, picksMap)[0];
    }).filter(Boolean);

    const rankedDivWinners = rankTeams(divWinners, regularSeasonGames, picksMap);
    const divWinnerAbbrs = new Set(rankedDivWinners.map(dw => dw.abbr));
    const nonDivWinners = confTeams.filter(t => !divWinnerAbbrs.has(t.abbr));
    const rankedWildCards = rankTeams(nonDivWinners, regularSeasonGames, picksMap).slice(0, 3);

    return [...rankedDivWinners, ...rankedWildCards].map((team, idx) => ({
      ...team,
      seed: idx + 1
    }));
  };

  return { AFC: getSeedsForConf('AFC'), NFC: getSeedsForConf('NFC') };
};

const getUserPlayoffGames = (weekNum, picksMap, userSeeds) => {
  const getConfTrees = (conf) => {
    const confSeeds = userSeeds[conf] || [];
    if (confSeeds.length < 7) return null;
    const [s1, s2, s3, s4, s5, s6, s7] = confSeeds;
    const findTeam = (pickVal) => confSeeds.find(s => s.name === pickVal || s.abbr === pickVal) || null;

    const wc1Winner = picksMap[`WC_${conf}_2v7`];
    const wc2Winner = picksMap[`WC_${conf}_3v6`];
    const wc3Winner = picksMap[`WC_${conf}_4v5`];

    const wcAdvancing = [findTeam(wc1Winner), findTeam(wc2Winner), findTeam(wc3Winner)].filter(Boolean).sort((a, b) => a.seed - b.seed);
    const allWcDone = Boolean(wc1Winner && wc2Winner && wc3Winner && wcAdvancing.length === 3);

    const divGame1 = {
      gameId: `DIV_${conf}_G1`,
      homeTeam: s1?.name || `${conf} #1`,
      awayTeam: allWcDone ? (wcAdvancing[2]?.name || 'Lowest WC') : 'Lowest WC',
      status: 'pending'
    };
    const divGame2 = {
      gameId: `DIV_${conf}_G2`,
      homeTeam: allWcDone ? (wcAdvancing[0]?.name || 'WC Adv') : 'WC Adv',
      awayTeam: allWcDone ? (wcAdvancing[1]?.name || 'WC Adv') : 'WC Adv',
      status: 'pending'
    };

    const div1Winner = picksMap[divGame1.gameId];
    const div2Winner = picksMap[divGame2.gameId];
    const validDiv1Winner = (div1Winner === divGame1.homeTeam || div1Winner === divGame1.awayTeam) ? findTeam(div1Winner) : null;
    const validDiv2Winner = (div2Winner === divGame2.homeTeam || div2Winner === divGame2.awayTeam) ? findTeam(div2Winner) : null;
    const confChampAdvancing = [validDiv1Winner, validDiv2Winner].filter(Boolean).sort((a, b) => a.seed - b.seed);
    const allDivDone = Boolean(allWcDone && validDiv1Winner && validDiv2Winner);

    const confGame = {
      gameId: `CONF_${conf}`,
      homeTeam: allDivDone ? (confChampAdvancing[0]?.name || `${conf} High`) : `${conf} High`,
      awayTeam: allDivDone ? (confChampAdvancing[1]?.name || `${conf} Low`) : `${conf} Low`,
      status: 'pending'
    };

    const confWinner = picksMap[confGame.gameId];
    const champ = (confWinner === confGame.homeTeam || confWinner === confGame.awayTeam) ? findTeam(confWinner) : null;

    return {
      wc: [
        { gameId: `WC_${conf}_2v7`, homeTeam: s2.name, awayTeam: s7.name, status: 'pending' },
        { gameId: `WC_${conf}_3v6`, homeTeam: s3.name, awayTeam: s6.name, status: 'pending' },
        { gameId: `WC_${conf}_4v5`, homeTeam: s4.name, awayTeam: s5.name, status: 'pending' }
      ],
      div: [divGame1, divGame2],
      conf: [confGame],
      champ
    };
  };

  const afc = getConfTrees('AFC');
  const nfc = getConfTrees('NFC');

  if (weekNum === 19) return [...(afc?.wc || []), ...(nfc?.wc || [])];
  if (weekNum === 20) return [...(afc?.div || []), ...(nfc?.div || [])];
  if (weekNum === 21) return [...(afc?.conf || []), ...(nfc?.conf || [])];
  if (weekNum === 22) {
    return [{
      gameId: 'SB_CHAMPIONSHIP',
      homeTeam: afc?.champ?.name || 'AFC Champion',
      awayTeam: nfc?.champ?.name || 'NFC Champion',
      status: 'pending'
    }];
  }
  return [];
};

// GET USER PICKS FOR A SPECIFIC LEAGUE
router.get('/:userId/:leagueId', async (req, res) => {
  try {
    const { userId, leagueId } = req.params;
    const pickSheet = await PickSheet.findOne({ user: userId, league: leagueId });
    if (!pickSheet) return res.status(200).json({ picks: [] });
    res.status(200).json(pickSheet);
  } catch (error) {
    console.error('Fetch picks error:', error);
    res.status(500).json({ error: 'Failed to fetch picks.' });
  }
});

// SUBMIT OR UPDATE PICKS
router.post('/submit', async (req, res) => {
  try {
    const { userId, leagueId, picks, isSubmitted, tiebreaker } = req.body;
    const league = await League.findById(leagueId);
    if (!league) return res.status(404).json({ error: "League not found." });

    const getPointsValue = (gameId) => {
      if (gameId.startsWith('WC_')) return 2;
      if (gameId.startsWith('DIV_')) return 3;
      if (gameId.startsWith('CONF_')) return 4;
      if (gameId.startsWith('SB_')) return 10;
      return 1;
    };

    const formattedPicks = Object.keys(picks).map(gameId => ({
      gameId,
      selectedTeam: picks[gameId],
      pointsValue: getPointsValue(gameId)
    }));

    let pickSheet = await PickSheet.findOne({ user: userId, league: leagueId });
    if (pickSheet) {
      pickSheet.picks = formattedPicks;
      pickSheet.isSubmitted = isSubmitted || false;
      // NEW: Update tiebreaker if provided
      if (tiebreaker !== undefined) pickSheet.tiebreaker = tiebreaker; 
      await pickSheet.save();
    } else {
      pickSheet = new PickSheet({
        user: userId,
        league: leagueId,
        picks: formattedPicks,
        isSubmitted: isSubmitted || false,
        tiebreaker: tiebreaker || 0 // NEW: Save initial tiebreaker
      });
      await pickSheet.save();
    }

    res.status(200).json({ message: 'Picks saved successfully!', pickSheet });
  } catch (error) {
    console.error('Submission error:', error);
    res.status(500).json({ error: 'Failed to save picks.' });
  }
});

// GET WEEKLY LEADERBOARD AND PICKS (Public to league members)
router.get('/league/:leagueId/week/:week', async (req, res) => {
  try {
    const { leagueId, week } = req.params;
    const weekNum = Number(week);
    const now = new Date();

    // 1. Find the league
    const league = await League.findById(leagueId);
    if (!league) {
      return res.status(404).json({ error: 'League not found.' });
    }

    // Safely map nicknames (protecting against old schemas or missing users)
    const nicknameMap = {};
    if (league.members && Array.isArray(league.members)) {
      league.members.forEach(m => {
        if (m && m.user) {
          nicknameMap[m.user.toString()] = m.nickname;
        }
      });
    }

    // 2. Fetch games and match week using numeric comparison
    const allDbGames = await Game.find({}).sort({ kickoffTime: 1 });
    let weekGames = allDbGames.filter(g => Number(g.week) === weekNum);

    // INJECT PLAYOFF PLACEHOLDERS FOR SEASON MODE BRACKETS
    if (league.pickMode === 'season' && weekNum >= 19) {
      if (weekNum === 19) {
        weekGames = [
          { gameId: 'WC_AFC_2v7', awayTeam: 'AFC #7', homeTeam: 'AFC #2', status: 'pending' },
          { gameId: 'WC_AFC_3v6', awayTeam: 'AFC #6', homeTeam: 'AFC #3', status: 'pending' },
          { gameId: 'WC_AFC_4v5', awayTeam: 'AFC #5', homeTeam: 'AFC #4', status: 'pending' },
          { gameId: 'WC_NFC_2v7', awayTeam: 'NFC #7', homeTeam: 'NFC #2', status: 'pending' },
          { gameId: 'WC_NFC_3v6', awayTeam: 'NFC #6', homeTeam: 'NFC #3', status: 'pending' },
          { gameId: 'WC_NFC_4v5', awayTeam: 'NFC #5', homeTeam: 'NFC #4', status: 'pending' }
        ];
      } else if (weekNum === 20) {
        weekGames = [
          { gameId: 'DIV_AFC_G1', awayTeam: 'AFC Low', homeTeam: 'AFC #1', status: 'pending' },
          { gameId: 'DIV_AFC_G2', awayTeam: 'AFC WC', homeTeam: 'AFC WC', status: 'pending' },
          { gameId: 'DIV_NFC_G1', awayTeam: 'NFC Low', homeTeam: 'NFC #1', status: 'pending' },
          { gameId: 'DIV_NFC_G2', awayTeam: 'NFC WC', homeTeam: 'NFC WC', status: 'pending' }
        ];
      } else if (weekNum === 21) {
        weekGames = [
          { gameId: 'CONF_AFC', awayTeam: 'AFC Adv', homeTeam: 'AFC Adv', status: 'pending' },
          { gameId: 'CONF_NFC', awayTeam: 'NFC Adv', homeTeam: 'NFC Adv', status: 'pending' }
        ];
      } else if (weekNum === 22) {
        weekGames = [
          { gameId: 'SB_CHAMPIONSHIP', awayTeam: 'AFC Champ', homeTeam: 'NFC Champ', status: 'pending' }
        ];
      }
    }

    const isSeasonPlayoffs = league.pickMode === 'season' && weekNum >= 19;
    
    if (!isSeasonPlayoffs && weekGames.length === 0) {
      return res.status(404).json({ error: `No games scheduled for Week ${weekNum}.` });
    }

    // 3. Determine if picks should be revealed
    let hasWeekStarted = league.pickVisibility === 'open'; // If open, reveal immediately

    if (!hasWeekStarted) {
      if (league.pickMode === 'season') {
        const firstGameOfSeason = allDbGames.find(g => Number(g.week) === 1);
        hasWeekStarted = firstGameOfSeason ? now >= new Date(firstGameOfSeason.kickoffTime) : true;
      } else {
        const firstGameOfWeek = weekGames[0];
        hasWeekStarted = firstGameOfWeek ? now >= new Date(firstGameOfWeek.kickoffTime) : true;
      }
    }

    // 4. Fetch all pick sheets for this league
    const pickSheets = await PickSheet.find({ league: leagueId }).populate('user', 'username');

    // Safely map users and filter out orphaned sheets
    const usersPicksRaw = pickSheets.map(sheet => {
      if (!sheet.user || !sheet.user._id) return null; // Protects against deleted users

      const allUserPicksMap = {};
      if (sheet.picks && Array.isArray(sheet.picks)) {
        sheet.picks.forEach(p => { 
          allUserPicksMap[p.gameId] = p.selectedTeam; 
        });
      }

      let weeklyPoints = 0;
      const picksMap = {};

      weekGames.forEach(g => {
        const picked = allUserPicksMap[g.gameId];
        picksMap[g.gameId] = hasWeekStarted ? picked : 'HIDDEN';

        if (g.status === 'final' && g.winner === picked) {
          // Add points for correct picks
          const matchedPick = sheet.picks.find(p => p.gameId === g.gameId);
          weeklyPoints += (matchedPick?.pointsValue || 1);
        }
      });

      return {
        userId: sheet.user._id,
        username: nicknameMap[sheet.user._id.toString()] || sheet.user.username,
        picks: picksMap,
        weeklyPoints
      };
    });

    // Remove any null records caused by deleted users
    const usersPicks = usersPicksRaw.filter(Boolean); 

    // 5. Rank players for the week (with standard competition ranking)
    usersPicks.sort((a, b) => b.weeklyPoints - a.weeklyPoints);
    usersPicks.forEach((player, idx, arr) => {
      player.rank = (idx > 0 && player.weeklyPoints === arr[idx - 1].weeklyPoints) 
        ? arr[idx - 1].rank 
        : idx + 1;
    });

    res.status(200).json({
      hasWeekStarted,
      games: weekGames,
      usersPicks
    });

  } catch (error) {
    console.error('Fetch league picks error:', error);
    res.status(500).json({ error: 'Failed to fetch league picks.' });
  }
});

// GET PUBLIC PICK SHEET FOR LEADERBOARD SCOUTING
router.get('/public/sheet/:sheetId', async (req, res) => {
  try {
    const { sheetId } = req.params;
    const now = new Date();

    // 1. Fetch the requested sheet and populate user/league info
    const sheet = await PickSheet.findById(sheetId)
      .populate('user', 'username')
      .populate('league', 'name pickMode');
      
    if (!sheet) return res.status(404).json({ error: 'Pick sheet not found.' });

    const isSeason = sheet.league.pickMode === 'season';
    const allGames = await Game.find({}).sort({ kickoffTime: 1 });

    // 2. Check if Season Mode is globally locked
    let seasonLocked = false;
    if (isSeason) {
      const firstGame = allGames.find(g => Number(g.week) === 1);
      seasonLocked = firstGame && now >= new Date(firstGame.kickoffTime);
    }

    // 3. Map the picks and mask anything that hasn't kicked off yet
    const formattedPicks = sheet.picks.map(p => {
      let game = allGames.find(g => g.gameId === p.gameId);
      
      // NEW: If the game isn't in the DB, check if it's a simulated playoff pick!
      if (!game) {
        if (p.gameId.startsWith('WC_')) game = { week: 19, awayTeam: 'Wild Card', homeTeam: 'Matchup', status: 'pending' };
        else if (p.gameId.startsWith('DIV_')) game = { week: 20, awayTeam: 'Divisional', homeTeam: 'Matchup', status: 'pending' };
        else if (p.gameId.startsWith('CONF_')) game = { week: 21, awayTeam: 'Conference', homeTeam: 'Championship', status: 'pending' };
        else if (p.gameId.startsWith('SB_')) game = { week: 22, awayTeam: 'AFC Champ', homeTeam: 'NFC Champ', status: 'pending' };
        else return null; 
      }

      const isOpenVisibility = sheet.league.pickVisibility === 'open';

      let isLocked = isOpenVisibility;
      if (!isLocked) {
        if (isSeason) {
          isLocked = seasonLocked;
        } else {
          const weekGames = allGames.filter(g => Number(g.week) === Number(game.week));
          const firstGameOfWeek = weekGames[0];
          isLocked = firstGameOfWeek ? now >= new Date(firstGameOfWeek.kickoffTime) : false;
        }
      }

      return {
        gameId: p.gameId,
        week: game.week,
        awayTeam: game.awayTeam,
        homeTeam: game.homeTeam,
        status: game.status || 'pending',
        winner: game.winner || null,
        selectedTeam: isLocked ? p.selectedTeam : 'HIDDEN'
      };
    }).filter(Boolean);

    res.status(200).json({
      username: sheet.user.username,
      leagueName: sheet.league.name,
      mode: sheet.league.pickMode,
      points: sheet.totalPoints,
      picks: formattedPicks
    });
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch public sheet.' });
  }
});

module.exports = router;