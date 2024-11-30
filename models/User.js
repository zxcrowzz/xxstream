const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  profileImageUrl: { type: String },
  
  // TOS agreement details
  tosAcceptedAt: { type: Date, required: false },  // Timestamp when user agreed to the TOS
  tosVersion: { type: String, default: '1.0' },    // Version of the TOS user accepted
});

module.exports = mongoose.model('User', userSchema);
