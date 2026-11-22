const mongoose = require('mongoose');

const orphanedMediaSchema = new mongoose.Schema(
  {
    fileId: {
      type: String,
      required: true,
      index: true,
    },
    mediaType: {
      type: String,
      enum: ['video', 'avatar'],
      default: 'video',
    },
    reason: {
      type: String,
      default: 'Deletion failed after DB update',
    },
    attempts: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('orphanedmedia', orphanedMediaSchema);
