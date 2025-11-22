import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

class DatabaseError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
  }
}

export async function connectDB(retryCount = 0) {
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    throw new DatabaseError('MONGODB_URI not set in .env', 'MISSING_ENV_VAR');
  }

  try {
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority'
    };

    await mongoose.connect(uri, options);
    
    // Connection events
    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB connected successfully');
    });

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected');
    });

    // Handle process termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed due to app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('MongoDB connection error:', error);
    
    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying connection (${retryCount + 1}/${MAX_RETRIES})...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return connectDB(retryCount + 1);
    }
    
    throw new DatabaseError(
      `Failed to connect to MongoDB after ${MAX_RETRIES} attempts: ${error.message}`,
      'CONNECTION_FAILED'
    );
  }
}

export async function disconnectDB() {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
    throw error;
  }
}

export function getConnectionStatus() {
  return {
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    name: mongoose.connection.name,
    models: mongoose.connection.modelNames(),
  };
}