const mongoose = require('mongoose');

/**
 * Executes a callback within a MongoDB transaction if replica set/sharding is supported.
 * Automatically falls back to direct execution if MongoDB is running standalone (e.g. local developer/client environment).
 * 
 * @param {Function} callback - async (session) => result
 * @returns {Promise<any>}
 */
const withTransaction = async (callback) => {
  let session = null;
  let hasActiveTransaction = false;

  try {
    session = await mongoose.startSession();
    session.startTransaction();
    hasActiveTransaction = true;
  } catch (err) {
    session = null;
    hasActiveTransaction = false;
  }

  if (hasActiveTransaction && session) {
    try {
      const result = await callback(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      try {
        await session.abortTransaction();
      } catch (abortErr) {}

      // If the error was due to standalone MongoDB not supporting transactions/replica sets
      const isReplicaSetError =
        error.message &&
        (error.message.includes('replica set') ||
         error.message.includes('Transaction numbers are only allowed') ||
         error.message.includes('Transactions are not supported'));

      if (isReplicaSetError) {
        // Fall back to direct execution without transaction
        return await callback(null);
      }

      throw error;
    } finally {
      try {
        session.endSession();
      } catch (e) {}
    }
  } else {
    // Direct execution without active transaction session
    return await callback(null);
  }
};

module.exports = { withTransaction };
