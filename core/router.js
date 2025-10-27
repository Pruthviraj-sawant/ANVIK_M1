// // placeholder - full code provided in ChatGPT document
// /// FILE: core/router.js
// import { detectIntent } from '../services/aiService.js';
// import { createCalendarEvent, getGoogleAuthUrl } from '../services/calendarTool.js';
// import { createNotionTask, getNotionConnectUrl } from '../services/notionTool.js';
// import { setReminder } from '../services/reminderTool.js';
// import { User } from '../models/User.js';


// export async function routeRequest(text, telegramId, bot) {
//   if (!text || typeof text !== 'string') {
//     console.warn('routeRequest received empty/non-string text:', text);
//     return '⚠️ Empty message received. Send a valid command.';
//   }

//   // 1) Fetch user record (or create minimal one)
//   let user = await User.findOne({ telegramId });
//   if (!user) {
//     user = await User.create({ telegramId });
//   }


//   // 2) Check for explicit connect commands
//   const lc = text.trim().toLowerCase();
//   if (lc.startsWith('connect google')) {
//     const url = await getGoogleAuthUrl(telegramId);
//     return `🔗 Authorize Google Calendar: ${url}`;
//   }
//   if (lc.startsWith('connect notion')) {
//     const url = await getNotionConnectUrl(telegramId);
//     return `🔗 Connect Notion: ${url}\nOr send your Notion integration token with: \`/notion_token YOUR_TOKEN YOUR_DB_ID\``;
//   }
//   if (lc.startsWith('/notion_token')) {
//     const parts = text.split(' ').filter(Boolean);
//     const token = parts[1];
//     const dbId = parts[2] || user.notion?.database_id;
//     if (!token || !dbId) return 'Usage: /notion_token <integration_token> <database_id>';
//     user.notion = { integration_token: token, database_id: dbId };
//     await user.save();
//     return '✅ Notion connected successfully.';
//   }


//   // 3) Use AI to detect intent
//   const intentData = await detectIntent(text);


//   // 4) Route to tools depending on intent
//   switch (intentData.intent) {
//     case 'create_event':
//       if (!user.google?.access_token) {
//         const url = await getGoogleAuthUrl(telegramId);
//         return `🔗 Please connect Google Calendar first: ${url}`;
//       }
//       return await createCalendarEvent(intentData.details, telegramId);


//     case 'add_task':
//       if (!user.notion?.integration_token) return '🔗 Please connect Notion first using "connect notion" or /notion_token';
//       return await createNotionTask(intentData.details, telegramId);


//     case 'set_reminder':
//       return await setReminder(intentData.details, telegramId, bot);


//     default:
//       return intentData.reply || '🤖 I did not understand. Try: add task..., schedule..., set reminder...';
//   }
// }
/// FILE: core/router.js
import { detectIntent } from '../services/aiService.js';
import { createCalendarEvent, getGoogleAuthUrl } from '../services/calendarTool.js';
import { createNotionTask, getNotionConnectUrl } from '../services/notionTool.js';
import { setReminder } from '../services/reminderTool.js';
import { User } from '../models/User.js';

export async function routeRequest(text, telegramId, bot) {
  if (!text || typeof text !== 'string') {
    console.warn('routeRequest received empty/non-string text:', text);
    return '⚠️ Empty message received. Send a valid command.';
  }

  // 1) Fetch user record (or create minimal one)
  let user = await User.findOne({ telegramId });
  if (!user) {
    user = await User.create({ telegramId });
  }

  // 2) Check for explicit connect commands
  const lc = text.trim().toLowerCase();
  if (lc.startsWith('connect google')) {
    const url = await getGoogleAuthUrl(telegramId);
    return `🔗 Authorize Google Calendar: ${url}`;
  }

  if (lc.startsWith('connect notion')) {
    const url = await getNotionConnectUrl(telegramId);
    return `🔗 Connect Notion: ${url}\nOr send your Notion integration token with: \`/notion_token YOUR_TOKEN\``;
  }

  if (lc.startsWith('/notion_token')) {
    const parts = text.split(' ').filter(Boolean);
    const token = parts[1];

    if (!token) return 'Usage: /notion_token <integration_token>';

    // Save only integration token; database will be auto-created when first task is added
    user.notion = { integration_token: token };
    await user.save();

    return '✅ Notion connected! The database will be created automatically when you add your first task.';
  }

  // 3) Use AI to detect intent
  const intentData = await detectIntent(text);

  // 4) Route to tools depending on intent
  switch (intentData.intent) {
    case 'create_event':
      if (!user.google?.access_token) {
        const url = await getGoogleAuthUrl(telegramId);
        return `🔗 Please connect Google Calendar first: ${url}`;
      }
      return await createCalendarEvent(intentData.details, telegramId);

 case 'add_task':
  if (!user.notionToken && !user.notion?.integration_token) 
    return '🔗 Please connect Notion first using "connect notion" or /notion_token';

  // Extract details safely
  const { title, description, due_date } = intentData.details;

  // Determine token from new schema or old
  const notionToken = user.notionToken || user.notion?.integration_token;

  const success = await createNotionTask(
    telegramId,      // ✅ must be string
    title || 'Untitled Task',
    description || 'No description provided',
    due_date || new Date().toISOString().split('T')[0]
  );

  return success
    ? `✅ Task '${title}' has been added with a due date of ${due_date}.`
    : '⚠️ Internal error. Try again later.';


    case 'set_reminder':
      return await setReminder(intentData.details, telegramId, bot);

    default:
      return intentData.reply || '🤖 I did not understand. Try: add task..., schedule..., set reminder...';
  }
}
