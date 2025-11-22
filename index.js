import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import morgan from 'morgan';
import TelegramBot from 'node-telegram-bot-api';
import { connectDB, disconnectDB, getConnectionStatus } from './db/connect.js';
import { routeRequest } from './core/router.js';
import authRoutes from './routes/authRoutes.js';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';

// Load environment variables
dotenv.config({ path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env' });

// Initialize Express app
const app = express();

// ======================
// Security Middleware
// ======================
app.use(helmet()); // Set security HTTP headers
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

// Apply rate limiting to all API routes
app.use('/api', limiter);

// ======================
// Request Parsing
// ======================
app.use(express.json({ limit: '10kb' })); // Body limit is 10kb
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ======================
// Logging
// ======================
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ======================
// Routes
// ======================
// Health check endpoint
app.get('/health', (req, res) => {
  const dbStatus = getConnectionStatus();
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus.readyState === 1 ? 'connected' : 'disconnected',
      host: dbStatus.host,
      name: dbStatus.name
    },
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);

// ======================
// Error Handling
// ======================
app.use(notFound);
app.use(errorHandler);

// ======================
// Server Initialization
// ======================
const PORT = process.env.PORT || 5000;
let server;
let bot;

// Graceful shutdown handler
const gracefulShutdown = async () => {
  console.log('Shutting down gracefully...');
  
  try {
    if (bot) {
      console.log('Stopping Telegram bot...');
      await bot.stopPolling();
    }
    
    await disconnectDB();
    
    if (server) {
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    }
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle termination signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Initialize application
const initApp = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Initialize Telegram bot if token is provided
    if (process.env.BOT_TOKEN) {
      bot = new TelegramBot(process.env.BOT_TOKEN, { 
        polling: true,
        request: {
          proxy: process.env.PROXY_URL || null
        }
      });

      // Bot message handler
      bot.on('message', async (msg) => {
        if (!msg || !msg.text) return;
        
        const chatId = msg.chat.id;
        const userTelegramId = String(msg.from.id);

        try {
          const reply = await routeRequest(msg.text, userTelegramId, bot);

          // Detect if the reply is a Google OAuth URL
          const urlRegex = /^https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth\?[\S]+$/;
          if (typeof reply === 'string' && urlRegex.test(reply.trim())) {
            await bot.sendMessage(chatId, `🔗 Please connect Google Calendar:\n${reply}`, {
              disable_web_page_preview: true,
              parse_mode: 'Markdown'
            });
          } else {
            await bot.sendMessage(chatId, reply, { parse_mode: 'Markdown' });
          }
        } catch (error) {
          console.error('Bot handler error:', error);
          await bot.sendMessage(chatId, '⚠️ An error occurred. Our team has been notified.');
        }
      });

      console.log('🤖 Telegram bot started');
    }

    // Start the server
    server = app.listen(PORT, () => {
      console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });

  } catch (error) {
    console.error('Failed to initialize application:', error);
    process.exit(1);
  }
};

// Start the application
initApp();
