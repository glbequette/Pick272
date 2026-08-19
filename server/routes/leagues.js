const express = require('express');
const router = express.Router();
const League = require('../models/League');
const User = require('../models/User');
const PickSheet = require('../models/PickSheet');

const generateInviteCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// CREATE A LEAGUE
router.post('/create', async (req, res) => {
  try {
    // RESTORED: Added 'nickname' back to the destructured body
    const { name, userId, pickMode, pickVisibility, nickname } = req.body; 
    
    let inviteCode = generateInviteCode();
    let isUnique = false;
    while (!isUnique) {
      const existing = await League.findOne({ inviteCode });
      if (!existing) isUnique = true;
      else inviteCode = generateInviteCode();
    }

    const newLeague = new League({
      name,
      inviteCode,
      creator: userId,
      // RESTORED: Save the creator's ID and chosen nickname
      members: [{ user: userId, nickname: nickname || 'Commish' }],
      pickMode: pickMode || 'season',
      pickVisibility: pickVisibility || 'hidden' 
    });

    await newLeague.save();
    await User.findByIdAndUpdate(userId, { $push: { leagues: newLeague._id } });

    res.status(201).json({ message: 'League created!', league: newLeague });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create league.' });
  }
});

// GET ALL LEAGUES FOR A SPECIFIC USER
router.get('/user/:userId', async (req, res) => {
  try {
    const userLeagues = await League.find({ 'members.user': req.params.userId })
      .select('name inviteCode pickMode pickVisibility') // Include pickVisibility
      .sort({ createdAt: -1 });
      
    res.status(200).json(userLeagues);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user leagues.' });
  }
});

// JOIN A LEAGUE
router.post('/join', async (req, res) => {
  try {
    const { inviteCode, userId, nickname } = req.body;

    const league = await League.findOne({ inviteCode: inviteCode.toUpperCase() });
    if (!league) {
      return res.status(404).json({ error: 'Invalid invite code.' });
    }

    // Check if the user is already in the league using the new subdocument structure
    const isAlreadyMember = league.members.some(member => member.user.toString() === userId);
    if (isAlreadyMember) {
      return res.status(400).json({ error: 'You are already in this league.' });
    }

    // Add user with their specific nickname
    league.members.push({ user: userId, nickname: nickname || 'Player' });
    await league.save();
    await User.findByIdAndUpdate(userId, { $push: { leagues: league._id } });

    res.status(200).json({ message: `Successfully joined ${league.name}!`, league });
  } catch (error) {
    res.status(500).json({ error: 'Failed to join league.' });
  }
});

// GET ALL LEAGUES FOR A SPECIFIC USER
router.get('/user/:userId', async (req, res) => {
  try {
    // Search for leagues where the user's ID exists inside the members array subdocuments
    const userLeagues = await League.find({ 'members.user': req.params.userId })
      .select('name inviteCode pickMode') 
      .sort({ createdAt: -1 });
      
    res.status(200).json(userLeagues);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user leagues.' });
  }
});

// GET LEAGUE STANDINGS
router.get('/:id/standings', async (req, res) => {
  try {
    const league = await League.findById(req.params.id);
    if (!league) {
      return res.status(404).json({ error: 'League not found.' });
    }

    const standings = await Promise.all(league.members.map(async (member) => {
      if (!member) return null;
      const sheet = await PickSheet.findOne({ user: member.user, league: league._id });
      
      return {
        userId: member.user,
        username: member.nickname,
        totalPoints: sheet ? sheet.totalPoints : 0,
        isSubmitted: sheet ? sheet.isSubmitted : false
      };
    }));

    const validStandings = standings.filter(Boolean);
    validStandings.sort((a, b) => b.totalPoints - a.totalPoints);

    // NEW: Apply tie-aware rankings to the league overall standings
    validStandings.forEach((player, idx, arr) => {
      player.rank = (idx > 0 && player.totalPoints === arr[idx - 1].totalPoints) 
        ? arr[idx - 1].rank 
        : idx + 1;
    });

    res.status(200).json({ 
      name: league.name, 
      inviteCode: league.inviteCode, 
      pickMode: league.pickMode, 
      pickVisibility: league.pickVisibility,
      standings: validStandings 
    });

  } catch (error) {
    console.error('Standings error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard.' });
  }
});

// LEAVE A LEAGUE
router.post('/leave', async (req, res) => {
  try {
    const { leagueId, userId } = req.body;

    const league = await League.findById(leagueId);
    if (!league) {
      return res.status(404).json({ error: 'League not found.' });
    }

    // 1. Filter the user out of the league's member array
    league.members = league.members.filter(member => member.user.toString() !== userId);
    await league.save();

    // 2. Remove the league from the User's profile
    await User.findByIdAndUpdate(userId, { $pull: { leagues: leagueId } });

    // 3. Delete their pick sheet for this specific league to clean up the database
    await PickSheet.findOneAndDelete({ user: userId, league: leagueId });

    res.status(200).json({ message: 'Successfully left the league.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to leave league.' });
  }
});

// GET TOTAL LEAGUES COUNT (Platform-wide)
router.get('/count', async (req, res) => {
  try {
    const count = await League.countDocuments();
    res.status(200).json({ count });
  } catch (error) {
    console.error('Error counting leagues:', error);
    res.status(500).json({ error: 'Failed to count leagues.' });
  }
});

module.exports = router;