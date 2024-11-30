const mongoose = require('mongoose');

const pendingUserSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    confirmationCode: { type: String, required: true, index: true }, // Confirmation code for email verification
    createdAt: { type: Date, default: Date.now, expires: 3600 }, // Document expires in 1 hour
    tosAcceptedAt: { type: Date, required: true }, // Timestamp of TOS agreement
    tosVersion: { type: String, default: '1.0' }, // TOS version agreed to
});

// Explicitly creating an index for confirmationCode (redundant here since `index: true` is already defined)
pendingUserSchema.index({ confirmationCode: 1 });

module.exports = mongoose.model('PendingUser', pendingUserSchema);
