// import express from 'express';
// import { getGoogleAuthUrl,handleGoogleCallback } from '../services/calendarTool.js';
// import { User } from '../models/User.js';


// const router = express.Router();



// // Step 1: Redirect user to Google Auth
// router.get('/google', async (req, res) => {
//   const telegramId = req.query.state || 'unknown';
//   const url = await getGoogleAuthUrl(telegramId);
//   res.redirect(url);
// });

// // Google OAuth2 callback
// router.get('/google/callback', async (req, res) => {
// const code = req.query.code;
// const state = req.query.state; // telegramId passed in state
// try {
// await handleGoogleCallback(code, state);
// return res.send('✅ Google connected. You can return to Telegram.');
// } catch (err) {
// console.error(err);
// return res.status(500).send('❌ Google callback failed.');
// }
// });


// // Notion: simple instruction page or callback placeholder
// router.get('/notion', async (req, res) => {
// const state = req.query.state; // telegramId
// return res.send(`To connect Notion, paste your integration token to your Telegram chat with: /notion_token <token> <database_id> . State: ${state}`);
// });


// export default router;
// FILE: routes/authRoutes.js
import express from 'express';
import { getGoogleAuthUrl, handleGoogleCallback } from '../services/calendarTool.js';
import { User } from '../models/User.js';
const router = express.Router();

router.get('/google', async (req, res) => {
  try {
    const telegramId = req.query.state || 'unknown';
    const url = await getGoogleAuthUrl(telegramId);
    return res.redirect(url);
  } catch (err) {
    console.error('Auth URL error:', err);
    return res.status(500).send('❌ Failed to generate Google Auth URL.');
  }
});

router.get('/google/callback', async (req, res) => {
  const code = req.query.code;
  const state = req.query.state;

  try {
    await handleGoogleCallback(code, state);
    return res.send('✅ Google connected. You can return to Telegram.');
  } catch (err) {
    console.error('Callback error:', err);
    return res.status(500).send('❌ Google callback failed.');
  }
});



// Optional: Notion placeholder
router.get('/notion', async (req, res) => {
  const state = req.query.state;
  return res.send(
    `To connect Notion, paste your integration token to your Telegram chat with: /notion_token <token> <database_id>. State: ${state}`
  );
});

export default router;
