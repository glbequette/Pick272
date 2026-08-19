const mongoose = require('mongoose');

// Sub-schema for individual picks
const pickSchema = new mongoose.Schema({
  gameId: { type: String, required: true },
  selectedTeam: { type: String, required: true },
  status: { type: String, enum: ['pending', 'won', 'lost', 'tie'], default: 'pending' },
  // NEW: Weighted scoring value
  pointsValue: { type: Number, default: 1 } 
}, { _id: false });

const pickSheetSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  league: { type: mongoose.Schema.Types.ObjectId, ref: 'League', required: true },
  picks: [pickSchema],
  totalPoints: { type: Number, default: 0 },
  isSubmitted: { type: Boolean, default: false },
  // NEW: Store the user's total season points prediction
  tiebreaker: { type: Number, default: 0 } 
}, { timestamps: true });

// Prevent a user from having duplicate pick sheets in the same league
pickSheetSchema.index({ user: 1, league: 1 }, { unique: true });

module.exports = mongoose.model('PickSheet', pickSheetSchema);