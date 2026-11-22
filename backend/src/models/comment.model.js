const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    food: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'food',
      required: true,
      index: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    authorRole: {
      type: String,
      enum: ['user', 'foodpartner'],
      required: true,
    },
    authorName: {
      type: String,
      required: true,
      trim: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

commentSchema.index({ food: 1, createdAt: -1 });

const commentModel = mongoose.model('comment', commentSchema);
module.exports = commentModel;
