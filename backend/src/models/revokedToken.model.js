const mongoose = require('mongoose');

const revokedTokenSchema = new mongoose.Schema({
  jti: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }, // MongoDB TTL auto-cleanup
  },
});

module.exports = mongoose.model('revokedtoken', revokedTokenSchema);
