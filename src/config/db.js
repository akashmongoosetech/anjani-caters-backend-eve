import mongoose from 'mongoose';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000;

export const connectDB = async (retryCount = 0) => {
  const uri = process.env.MONGODB_URI;
  const isPlaceholder = !uri || 
    uri.includes("YOUR_CLUSTER") || 
    uri.includes("YOUR_DB_USERNAME") || 
    uri.includes("YOUR_DATABASE") || 
    uri.includes("YOUR_");

  if (isPlaceholder) {
    console.log("[MongoDB] MONGODB_URI is unconfigured — running without database.");
    return false;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    });
    console.log(`[MongoDB] Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.warn(`[MongoDB] Connection attempt ${retryCount + 1} failed (${error.message}). Retrying in ${RETRY_DELAY_MS / 1000}s...`);
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
      return connectDB(retryCount + 1);
    }
    console.error(`[MongoDB] All ${MAX_RETRIES} connection attempts failed. Starting without database.`);
    return false;
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Disconnected from MongoDB');
});

mongoose.connection.on('reconnected', () => {
  console.log('[MongoDB] Reconnected to MongoDB');
});
