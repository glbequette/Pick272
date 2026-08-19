const express = require('express');
const router = express.Router();
const User = require('../models/User');

// GET USER'S FRIENDS LIST
router.get('/:userId', async (req, res) => {
  try {
    // Populate looking inside the new 'user' sub-property
    const user = await User.findById(req.params.userId).populate('friends.user', 'username friendCode');
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // FIX: Safely filter out old data formats and deleted accounts before mapping
    const mappedFriends = user.friends
      .filter(f => f && f.user && f.user._id) 
      .map(f => ({
        _id: f.user._id,
        username: f.user.username,
        friendCode: f.user.friendCode,
        nickname: f.nickname || f.user.username
      }));

    res.status(200).json({ friendsList: mappedFriends, friendCode: user.friendCode });
  } catch (error) {
    console.error('Fetch friends error:', error);
    res.status(500).json({ error: 'Failed to fetch friends.' });
  }
});

// ADD A FRIEND VIA FRIEND CODE
router.post('/add', async (req, res) => {
  try {
    const { userId, friendCode } = req.body;
    if (!friendCode) return res.status(400).json({ error: 'Please enter a friend code.' });

    const currentUser = await User.findById(userId);
    const targetUser = await User.findOne({ friendCode: friendCode.trim().toUpperCase() });

    if (!targetUser) return res.status(404).json({ error: 'Invalid friend code.' });
    if (currentUser._id.toString() === targetUser._id.toString()) return res.status(400).json({ error: "You can't add yourself!" });
    
    const alreadyFriends = currentUser.friends.some(f => f.user.toString() === targetUser._id.toString());
    if (alreadyFriends) return res.status(400).json({ error: 'Already friends.' });

    // Push objects instead of just IDs
    currentUser.friends.push({ user: targetUser._id, nickname: targetUser.username });
    targetUser.friends.push({ user: currentUser._id, nickname: currentUser.username });

    await currentUser.save();
    await targetUser.save();

    res.status(200).json({ message: `Added ${targetUser.username} as a friend!` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add friend.' });
  }
});

// REMOVE A FRIEND
router.post('/remove', async (req, res) => {
  try {
    const { userId, friendId } = req.body;
    const currentUser = await User.findById(userId);
    const targetUser = await User.findById(friendId);

    // Filter using the new subdocument structure
    currentUser.friends = currentUser.friends.filter(f => f.user.toString() !== friendId);
    targetUser.friends = targetUser.friends.filter(f => f.user.toString() !== userId);

    await currentUser.save();
    await targetUser.save();

    res.status(200).json({ message: 'Friend removed.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove friend.' });
  }
});

// UPDATE FRIEND NICKNAME
router.put('/nickname', async (req, res) => {
  try {
    const { userId, friendId, nickname } = req.body;
    const user = await User.findById(userId);
    
    const friendIndex = user.friends.findIndex(f => f.user.toString() === friendId);
    if (friendIndex === -1) return res.status(404).json({ error: 'Friend not found.' });

    user.friends[friendIndex].nickname = nickname;
    await user.save();

    res.status(200).json({ message: 'Nickname updated!' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update nickname.' });
  }
});

module.exports = router;