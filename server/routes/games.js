const express = require('express');
const router = express.Router();
const Game = require('../models/Game');

// GET all regular season games sorted by week and kickoff time
router.get('/', async (req, res) => {
  try {
    const games = await Game.find().sort({ week: 1, kickoffTime: 1 });
    res.json(games);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

module.exports = router;