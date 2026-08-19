const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  gameId: {
    type: String,
    required: true,
    unique: true // e.g., "2026_W01_NE_SEA"
  },
  week: {
    type: Number,
    required: true,
    min: 1,
    max: 18
  },
  homeTeam: {
    type: String,
    required: true
  },
  awayTeam: {
    type: String,
    required: true
  },
  kickoffTime: {
    type: Date,
    required: true
  },
  homeScore: {
    type: Number,
    default: null
  },
  awayScore: {
    type: Number,
    default: null
  },
  winner: {
    type: String,
    default: null // e.g., "SEA", "NE", or "TIE"
  },
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'final'],
    default: 'scheduled'
  }
});

module.exports = mongoose.model('Game', gameSchema);