require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../db/db');
const foodModel = require('../models/food.model');
const foodPartnerModel = require('../models/foodpartner.model');
const likeModel = require('../models/likes.model');
const saveModel = require('../models/save.model');
const commentModel = require('../models/comment.model');
const followModel = require('../models/follow.model');

async function reconcileCounters() {
  await connectDB();

  const [likeCounts, saveCounts, commentCounts, followCounts] = await Promise.all([
    likeModel.aggregate([{ $group: { _id: '$food', count: { $sum: 1 } } }]),
    saveModel.aggregate([{ $group: { _id: '$food', count: { $sum: 1 } } }]),
    commentModel.aggregate([{ $group: { _id: '$food', count: { $sum: 1 } } }]),
    followModel.aggregate([{ $group: { _id: '$foodPartner', count: { $sum: 1 } } }]),
  ]);

  const likeMap = new Map(likeCounts.map((x) => [x._id.toString(), x.count]));
  const saveMap = new Map(saveCounts.map((x) => [x._id.toString(), x.count]));
  const commentMap = new Map(commentCounts.map((x) => [x._id.toString(), x.count]));
  const followMap = new Map(followCounts.map((x) => [x._id.toString(), x.count]));

  const foods = await foodModel.find({}).select('_id').lean();
  const foodOps = foods.map((f) => {
    const id = f._id.toString();
    return {
      updateOne: {
        filter: { _id: f._id },
        update: {
          $set: {
            likeCount: likeMap.get(id) || 0,
            savesCount: saveMap.get(id) || 0,
            commentsCount: commentMap.get(id) || 0,
          },
        },
      },
    };
  });

  const partners = await foodPartnerModel.find({}).select('_id').lean();
  const partnerOps = partners.map((p) => {
    const id = p._id.toString();
    return {
      updateOne: {
        filter: { _id: p._id },
        update: { $set: { followersCount: followMap.get(id) || 0 } },
      },
    };
  });

  if (foodOps.length) await foodModel.bulkWrite(foodOps);
  if (partnerOps.length) await foodPartnerModel.bulkWrite(partnerOps);

  console.log(`Reconciled ${foodOps.length} food items and ${partnerOps.length} partners.`);
  await mongoose.disconnect();
}

if (require.main === module) {
  reconcileCounters().catch((err) => {
    console.error('Counter reconciliation failed:', err);
    process.exit(1);
  });
}

module.exports = { reconcileCounters };
