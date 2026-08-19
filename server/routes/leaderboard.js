const express = require('express');
const router = express.Router();
const League = require('../models/League');
const PickSheet = require('../models/PickSheet');
const User = require('../models/User'); // <-- NEW: Required to fetch your friends list

router.get('/global', async (req, res) => {
  try {
    const { userId, scope } = req.query;

    // 1. Fetch all leagues and map their lock modes
    const leagues = await League.find({}).select('_id name pickMode');
    const leagueMap = {};
    leagues.forEach((l) => {
      leagueMap[l._id.toString()] = {
        name: l.name,
        pickMode: l.pickMode || 'season'
      };
    });

    // 2. NEW: Handle Friends Scope Filtering
    let allowedUserIds = null;
    const friendNicknames = {};

    if (scope === 'friends' && userId) {
      const user = await User.findById(userId);
      if (user) {
        allowedUserIds = new Set(user.friends.map(f => f.user.toString()));
        allowedUserIds.add(userId.toString()); // Make sure you are on your own leaderboard!

        // Map their custom nicknames
        user.friends.forEach(f => {
          friendNicknames[f.user.toString()] = f.nickname;
        });
      }
    }

    // 3. Fetch all pick sheets with user details
    const pickSheets = await PickSheet.find({})
      .populate('user', 'username')
      .select('user league totalPoints picks');

    const seasonSheets = [];
    const weeklySheets = [];

    pickSheets.forEach((sheet) => {
      if (!sheet.user) return;
      
      const sheetUserId = sheet.user._id.toString();

      // NEW: Filter out non-friends if the user clicked the Friends tab
      if (allowedUserIds && !allowedUserIds.has(sheetUserId)) return;

      const leagueInfo = leagueMap[sheet.league?.toString()];
      const mode = leagueInfo ? leagueInfo.pickMode : 'season';
      const leagueName = leagueInfo ? leagueInfo.name : 'Unknown League';

      // NEW: Apply custom nickname if in friends mode, otherwise default to username
      const displayUsername = friendNicknames[sheetUserId] || sheet.user.username;

      const entry = {
        sheetId: sheet._id,
        userId: sheetUserId,
        username: displayUsername,
        leagueName,
        points: sheet.totalPoints || 0
      };

      if (mode === 'season') {
        seasonSheets.push(entry);
      } else {
        weeklySheets.push(entry);
      }
    });

    // Sort descending by points
    seasonSheets.sort((a, b) => b.points - a.points);
    weeklySheets.sort((a, b) => b.points - a.points);

    // 4. Helper to format top 50, apply ties, and calculate user stats
    const processLeaderboard = (sortedList) => {
      const totalEntries = sortedList.length;

      // Tie-aware ranking
      const rankedList = sortedList.map((item, idx, arr) => {
        item.rank = (idx > 0 && item.points === arr[idx - 1].points) 
          ? arr[idx - 1].rank 
          : idx + 1;
        return item;
      });

      const top50 = rankedList.slice(0, 50);

      let userStats = null;
      let userEntries = []; 

      if (userId && totalEntries > 0) {
        userEntries = rankedList.filter((item) => item.userId === userId.toString());

        if (userEntries.length > 0) {
          const bestEntry = userEntries[0];
          
          const lowerEntriesCount = totalEntries - bestEntry.rank;
          const percentile = totalEntries === 1 
            ? 100 
            : Math.max(1, Math.round((lowerEntriesCount / (totalEntries - 1)) * 100));

          const topPercentage = Math.max(1, Math.round((bestEntry.rank / totalEntries) * 100));

          userStats = {
            rank: bestEntry.rank,
            points: bestEntry.points,
            leagueName: bestEntry.leagueName,
            totalParticipants: totalEntries,
            percentile,
            topPercentage
          };
        }
      }

      return {
        top50,
        totalEntries,
        userStats,
        userEntries
      };
    };

    res.status(200).json({
      season: processLeaderboard(seasonSheets),
      weekly: processLeaderboard(weeklySheets)
    });
  } catch (error) {
    console.error('Global leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch global leaderboard.' });
  }
});

module.exports = router;