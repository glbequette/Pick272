const mongoose = require('mongoose');

const leagueSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  inviteCode: { type: String, required: true, unique: true, uppercase: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    nickname: { type: String }
  }],
  pickMode: { 
    type: String, 
    enum: ['season', 'weekly'], 
    default: 'season' 
  },
  
  // NEW: Configurable visibility setting
  pickVisibility: {
    type: String,
    enum: ['hidden', 'open'], // 'hidden' = locked until kickoff, 'open' = visible immediately
    default: 'hidden'
  }
}, { timestamps: true });

module.exports = mongoose.model('League', leagueSchema);