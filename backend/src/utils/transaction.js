const mongoose = require('mongoose');

/**
 * Executes `work(session)` inside a MongoDB transaction when running on a replica set
 * (e.g., MongoDB Atlas), and gracefully falls back to non-transactional atomic execution
 * on standalone local MongoDB instances or unit tests.
 */
async function runWithTransaction(work) {
  if (process.env.NODE_ENV === 'test' || mongoose.connection.readyState !== 1) {
    return work(null);
  }

  let session;
  try {
    session = await mongoose.startSession();
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (err) {
    // Standalone MongoDB throws error code 20 (IllegalOperation) for transactions
    if (err?.code === 20 || /Transaction numbers are only allowed/i.test(err?.message || '')) {
      return work(null);
    }
    throw err;
  } finally {
    if (session) {
      await session.endSession().catch(() => {});
    }
  }
}

module.exports = { runWithTransaction };
