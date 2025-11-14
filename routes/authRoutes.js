
// FILE: routes/authRoutes.js
import express from 'express';
import { getGoogleAuthUrl, handleGoogleCallback } from '../services/calendarTool.js';
import { User } from '../models/User.js';
import querystring from 'querystring';
import axios from 'axios';
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
    let successHTML = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Login Successful</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #F0F4F7; /* Light gray-blue background */
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            text-align: center;
          }
          .container {
            background-color: #FFFFFF;
            padding: 2.5rem 3rem;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
            max-width: 400px;
            width: 90%;
          }
          h1 {
            color: #2E7DDB; /* Telegram blue */
            font-size: 1.75rem;
            margin-bottom: 0.5rem;
          }
          p {
            font-size: 1.1rem;
            color: #333;
            line-height: 1.5;
            margin-bottom: 2rem;
          }
          .button {
            display: inline-block;
            background-color: #0088CC; /* Telegram primary button color */
            color: #FFFFFF;
            padding: 1rem 1.5rem;
            font-size: 1.1rem;
            font-weight: 600;
            text-decoration: none;
            border-radius: 8px;
            transition: background-color 0.3s ease;
            border: none;
            cursor: pointer;
          }
          .button:hover {
            background-color: #0077B3; /* Darker blue on hover */
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Login Successful!</h1>
          <p>✅ Google connected. You can now return to Telegram.</p>
          <a href="https://t.me/AnvikAssistant_Bot" class="button">
            Return to @AnvikAssistant_Bot
          </a>
        </div>
      </body>
      </html>
    `;
    return res.send(successHTML);
  } catch (err) {
    console.error('Callback error:', err);
    let errorHTML = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Login Failed</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #F0F4F7; /* Light gray-blue background */
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            text-align: center;
          }
          .container {
            background-color: #FFFFFF;
            padding: 2.5rem 3rem;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
            max-width: 400px;
            width: 90%;
          }
          h1 {
            color: #D9534F; /* Error red */
            font-size: 1.75rem;
            margin-bottom: 0.5rem;
          }
          p {
            font-size: 1.1rem;
            color: #333;
            line-height: 1.5;
            margin-bottom: 2rem;
          }
          .button {
            display: inline-block;
            background-color: #0088CC; /* Telegram primary button color */
            color: #FFFFFF;
            padding: 1rem 1.5rem;
            font-size: 1.1rem;
            font-weight: 600;
            text-decoration: none;
            border-radius: 8px;
            transition: background-color 0.3s ease;
            border: none;
            cursor: pointer;
          }
          .button:hover {
            background-color: #0077B3; /* Darker blue on hover */
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Login Failed</h1>
          <p>❌ An error occurred while connecting your Google account. Please try again.</p>
          <a href="https://t.me/AnvikAssistant_Bot" class="button">
            Return to @AnvikAssistant_Bot
          </a>
        </div>
      </body>
      </html>
    `;
    return res.status(500).send(errorHTML);
  }
});



/**
 * STEP 1️⃣ Redirect user to Notion authorization page
 */
router.get("/notion", (req, res) => {
  const telegramId = req.query.state || "unknown";
  const params = querystring.stringify({
    client_id: process.env.NOTION_CLIENT_ID,
    response_type: "code",
    owner: "user",
    redirect_uri: process.env.NOTION_REDIRECT_URI,
    state: telegramId,
  });

  const url = `https://api.notion.com/v1/oauth/authorize?${params}`;
  res.redirect(url);
});

/**
 * STEP 2️⃣ Handle OAuth Callback
 */

router.get('/notion/callback', async (req, res) => {
  const { code, state } = req.query;
  const telegramId = state?.startsWith("tg_") ? state.replace("tg_", "") : state; // Extract Telegram ID safely

  try {
    // Exchange authorization code for access token
    const notionResponse = await axios.post(
      'https://api.notion.com/v1/oauth/token',
      {
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.NOTION_REDIRECT_URI,
      },
      {
        auth: {
          username: process.env.NOTION_CLIENT_ID,
          password: process.env.NOTION_CLIENT_SECRET,
        },
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const { access_token, workspace_id, workspace_name } = notionResponse.data;

    // ✅ Step 1: Check if Telegram user exists
    let user = await User.findOne({ telegramId });
if (!user) user = await User.create({ telegramId });
user.notionToken = access_token;
user.notionWorkspaceId = workspace_id;
user.notionWorkspaceName = workspace_name;
await user.save();


    // ✅ Step 4: Respond to the browser
    res.send(`
      <html><body style="text-align:center; font-family:sans-serif; margin-top:50px;">
        <h2>✅ Notion Connected!</h2>
        <p>Workspace: <b>${workspace_name}</b></p>
        <a href="https://t.me/AnvikAssistant_Bot">Return to Telegram</a>
      </body></html>
    `);

  } catch (err) {
    console.error("❌ Notion OAuth error:", err.response?.data || err.message);
    res.status(500).send(`
      <html><body>
        <h2>❌ Notion Connection Failed</h2>
        <pre>${err.response?.data?.error_description || err.message}</pre>
      </body></html>
    `);
  }
});



export default router;

