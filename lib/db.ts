import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not defined in .env.local');
  throw new Error('Please define MONGODB_URI in .env.local');
}

const userSchema = new mongoose.Schema({
  fid: { type: String, required: true, unique: true },
  mine: [{ type: String }],
  bought: [{ type: String }],
});

const pollSchema = new mongoose.Schema({
  ca: { type: String, required: true },
  Q: { type: String, required: true },
  Ans: [{ option: String, count: Number }],
  time: { type: Date, required: true },
  voted: [{ type: String }],
});

const nftSchema = new mongoose.Schema({
  ca: { type: String, required: true, unique: true },
  uri: { type: String, required: true },
  name: { type: String, required: true },
});

export const User = mongoose.models.User || mongoose.model('User', userSchema);
// export const Poll = mongoose.models.Poll || mongoose.model('Poll', pollSchema);
export const NFT = mongoose.models.NFT || mongoose.model('NFT', nftSchema);

export async function connectDB() {
  if (mongoose.connection.readyState >= 1) {
    console.log('Already connected to MongoDB');
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
      authSource: 'admin',
    });
    console.log('Connected to MongoDB:', MONGODB_URI.replace(/:[^@]+@/, ':****@'));
  } catch (error) {
    console.error('MongoDB connection error:', error.message, error.stack);
    throw error;
  }
}
