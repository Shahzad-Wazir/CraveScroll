require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../db/db');
const orphanedMediaModel = require('../models/orphanedMedia.model');
const storageService = require('../services/storage.service');

async function cleanupOrphanedMedia() {
  await connectDB();
  const records = await orphanedMediaModel.find({}).limit(100);
  let cleaned = 0;

  for (const record of records) {
    const ok = await storageService.deleteFile(record.fileId);
    if (ok) {
      await orphanedMediaModel.deleteOne({ _id: record._id });
      cleaned += 1;
    } else {
      record.attempts += 1;
      await record.save();
    }
  }

  console.log(`Orphaned media cleanup complete: ${cleaned}/${records.length} deleted.`);
  await mongoose.disconnect();
}

if (require.main === module) {
  cleanupOrphanedMedia().catch((err) => {
    console.error('Cleanup failed:', err);
    process.exit(1);
  });
}

module.exports = { cleanupOrphanedMedia };
