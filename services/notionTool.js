// // // placeholder - full code provided in ChatGPT document
// // /// FILE: services/notionTool.js
// // import { Client } from '@notionhq/client';
// // import { User } from '../models/User.js';
// // import dotenv from 'dotenv';
// // dotenv.config();


// // // If using OAuth for Notion, implement /auth/notion/callback similarly. For simplicity we support manual token paste + db id.
// // export async function getNotionConnectUrl(telegramId) {
// // // Placeholder for real OAuth; return instruction
// // return `${process.env.BASE_URL}/auth/notion?state=${telegramId}`;
// // }


// // export async function createNotionTask(details, telegramId) {
// // const user = await User.findOne({ telegramId });
// // if (!user?.notion?.integration_token) return '⚠️ Notion not connected.';


// // const notion = new Client({ auth: user.notion.integration_token });


// // const title = details.title || 'Task from Anvik';


// // await notion.pages.create({
// // parent: { database_id: user.notion.database_id },
// // properties: {
// // Name: {
// // title: [{ text: { content: title } }]
// // }
// // }
// // });


// // return '📝 Task added to your Notion database.';
// // }
// /// FILE: services/notionTool.js
// import { Client } from '@notionhq/client';
// import { User } from '../models/User.js';
// import dotenv from 'dotenv';
// dotenv.config();

// /**
//  * Get Notion OAuth connect URL for a user
//  * @param {string} telegramId - Telegram user ID
//  * @returns {string} Notion OAuth URL or instructions
//  */
// export async function getNotionConnectUrl(telegramId) {
//   // Placeholder: In real OAuth, generate URL with state
//   return `${process.env.BASE_URL}/auth/notion?state=${telegramId}`;
// }

// /**
//  * Create a task in user's Notion database
//  * @param {Object} details - Task details (title, description, dueDate)
//  * @param {string} telegramId - Telegram user ID
//  * @returns {string} Status message
//  */
// export async function createNotionTask(details, telegramId) {
//   try {
//     const user = await User.findOne({ telegramId });
//     if (!user?.notion?.integration_token || !user?.notion?.database_id) {
//       return '⚠️ Notion not connected. Please connect your Notion account first.';
//     }

//     const notion = new Client({ auth: user.notion.integration_token });

//     const title = details.title || 'Task from Anvik';
//     const description = details.description || '';
//     const dueDate = details.dueDate; // Optional ISO date string

//     const properties = {
//       Name: {
//         title: [{ text: { content: title } }]
//       }
//     };

//     if (description) {
//       properties.Description = {
//         rich_text: [{ text: { content: description } }]
//       };
//     }

//     if (dueDate) {
//       properties.Due = {
//         date: { start: dueDate } // ISO string, e.g., '2025-11-20'
//       };
//     }

//     await notion.pages.create({
//       parent: { database_id: user.notion.database_id },
//       properties
//     });

//     return '📝 Task added to your Notion database successfully.';
//   } catch (error) {
//     console.error('Notion API error:', error);
//     return '❌ Failed to add task to Notion. Please try again later.';
//   }
// }
/// FILE: services/notionTool.js
import { Client } from '@notionhq/client';
import { User } from '../models/User.js';
import dotenv from 'dotenv';
dotenv.config();

export async function getNotionConnectUrl(telegramId) {
  return `${process.env.BASE_URL}/auth/notion?state=${telegramId}`;
}

export async function createNotionTask(telegramId, title, description, due_date) {
  try {
    // Force telegramId to string
    telegramId = String(telegramId);

    const user = await User.findOne({ telegramId });
    if (!user) throw new Error('User not found. Please connect Notion using /notion_token.');
    if (!user.notionToken) throw new Error('Notion not connected. Use /notion_token to connect your Notion account.');

    const notion = new Client({ auth: user.notionToken });
    let { notionDatabaseId, notionParentPageId } = user;

    // Create workspace page
    if (!notionParentPageId) {
      const parentPage = await notion.pages.create({
        parent: { type: 'workspace', workspace: true },
        properties: {},
        icon: { type: 'emoji', emoji: '🧠' },
        cover: {
          type: 'external',
          external: { url: 'https://www.notion.so/front-static/meta/default.png' },
        },
        children: [
          {
            object: 'block',
            type: 'heading_1',
            heading_1: {
              rich_text: [{ type: 'text', text: { content: 'Welcome to your Anvik Workspace 👋' } }],
            },
          },
        ],
      });

      notionParentPageId = parentPage.id;
      user.notionParentPageId = notionParentPageId;
      await user.save();
    }

    // Create database
    if (!notionDatabaseId) {
      const db = await notion.databases.create({
        parent: { page_id: notionParentPageId },
        title: [{ type: 'text', text: { content: 'Anvik Tasks' } }],
        properties: {
          Title: { title: {} },
          Description: { rich_text: {} },
          DueDate: { date: {} },
        },
      });

      notionDatabaseId = db.id;
      user.notionDatabaseId = notionDatabaseId;
      await user.save();
    }

    // Add task
    await notion.pages.create({
      parent: { database_id: notionDatabaseId },
      properties: {
        Title: { title: [{ text: { content: title || 'Untitled Task' } }] },
        Description: { rich_text: [{ text: { content: description || 'No description provided' } }] },
        DueDate: { date: { start: due_date || new Date().toISOString().split('T')[0] } },
      },
    });

    console.log(`✅ Task '${title}' added to Notion for user ${telegramId}`);
    return true;
  } catch (error) {
    console.error('❌ Notion API error:', error.body || error.message || error);
    return false;
  }
}
