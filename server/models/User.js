const mongoose = require('mongoose');

// NEW: Define a sub-schema for friends to hold their ID and nickname
const friendSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  nickname: { type: String, trim: true }
}, { _id: false });

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  leagues: [{ type: mongoose.Schema.Types.ObjectId, ref: 'League' }],
  friendCode: { type: String, unique: true, uppercase: true },
  
  // UPDATED: Use the new friendSchema
  friends: [friendSchema]
}, { timestamps: true });

// Auto-generate a unique 6-character friend code before saving a new user
userSchema.pre('save', async function () {
  // Only run this if the user is brand new and doesn't have a code yet
  if (this.isNew && !this.friendCode) {
    let isUnique = false;
    
    while (!isUnique) {
      // Generate a random 10-character alphanumeric code
      const code = Math.random().toString(36).substring(2, 12).toUpperCase();
      
      // Check the database to ensure no one else has the same code
      const existing = await mongoose.models.User.findOne({ friendCode: code });
      if (!existing) {
        this.friendCode = code;
        isUnique = true;
      }
    }
  }
});

module.exports = mongoose.model('User', userSchema);