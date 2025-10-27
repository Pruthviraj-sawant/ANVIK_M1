// // placeholder - full code provided in ChatGPT document
// import express from 'express';
// import dotenv from 'dotenv';
// import TelegramBot from 'node-telegram-bot-api';
// import { connectDB } from './db/connect.js';
// import { routeRequest } from './core/router.js';
// import authRoutes from './routes/authRoutes.js';


// dotenv.config();
// const app = express();
// app.use(express.json());


// // Mount OAuth routes
// app.use('/auth', authRoutes);


// const PORT = process.env.PORT || 5000;


// (async () => {
// await connectDB();


// // Telegram Bot (polling)
// const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// bot.on('message', async (msg) => {
//   if (!msg || !msg.text) return;
//   const chatId = msg.chat.id;
//   const userTelegramId = String(msg.from.id);

//   try {
//     const reply = await routeRequest(msg.text, userTelegramId, bot);

//     // Detect if the reply is a Google OAuth URL
//     const urlRegex = /^https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth\?[\S]+$/;
//     if (typeof reply === 'string' && urlRegex.test(reply.trim())) {
//       // Send raw URL text — DO NOT use Markdown or HTML
//       await bot.sendMessage(chatId, `🔗 Please connect Google Calendar:\n${reply}`, {
//         disable_web_page_preview: true
//       });
//     } else {
//       // Other messages can still use Markdown
//       await bot.sendMessage(chatId, reply, { parse_mode: 'Markdown' });
//     }
//   } catch (err) {
//     console.error('Handler error:', err);
//     await bot.sendMessage(chatId, '⚠️ Internal error. Try again later.');
//   }
// });


// app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
// })();
// ✅ FINAL VERSION
import express from 'express';
import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import { connectDB } from './db/connect.js';
import { routeRequest } from './core/router.js';
import authRoutes from './routes/authRoutes.js';

dotenv.config();
const app = express();
app.use(express.json());

// Mount OAuth routes
app.use('/auth', authRoutes);

const PORT = process.env.PORT || 5000;

(async () => {
  await connectDB();

  // Telegram Bot (polling)
  const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

  // Function to escape MarkdownV2 special chars
  const escapeMarkdownV2 = (text) => {
    return text
      .replace(/_/g, '\\_')
      .replace(/\*/g, '\\*')
      .replace(/\[/g, '\\[')
      .replace(/`/g, '\\`')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/~/g, '\\~')
      .replace(/>/g, '\\>')
      .replace(/#/g, '\\#')
      .replace(/\+/g, '\\+')
      .replace(/-/g, '\\-')
      .replace(/=/g, '\\=')
      .replace(/\|/g, '\\|')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      .replace(/\./g, '\\.')
      .replace(/!/g, '\\!');
  };

  bot.on('message', async (msg) => {
    if (!msg || !msg.text) return;
    const chatId = msg.chat.id;
    const userTelegramId = String(msg.from.id);

    try {
      const reply = await routeRequest(msg.text, userTelegramId, bot);

      // Detect if the reply is a Google OAuth URL
      const urlRegex = /^https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth\?[\S]+$/;

     if (typeof reply === 'string' && reply.includes('https://accounts.google.com/o/oauth2/v2/auth')) {
  // Send as plain text (no markdown, no parsing)
  await bot.sendMessage(chatId, `🔗 Please connect Google Calendar:\n${reply}`, {
    disable_web_page_preview: true,
    parse_mode: undefined
  });
} else {
        // Other normal replies can still use Markdown
        // Escape for MarkdownV2
      const safeReply = escapeMarkdownV2(reply);
      await bot.sendMessage(chatId, safeReply, { parse_mode: 'MarkdownV2' });
      }
    } catch (err) {
      console.error('Handler error:', err);
      await bot.sendMessage(chatId, '⚠️ Internal error. Try again later.');
    }
  });

  app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
})();
