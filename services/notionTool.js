// FILE: services/notionTool.js
import { Client } from '@notionhq/client';
import { User } from '../models/User.js';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Get Notion connect URL for manual connection
 */
export async function getNotionConnectUrl(telegramId) {
  return `${process.env.BASE_URL}/auth/notion?state=${telegramId}`;
}

/**
 * Create Notion client for user
 */
async function getNotionClient(telegramId) {
  const user = await User.findOne({ telegramId: String(telegramId) });
  if (!user || !user.notionToken)
    throw new Error('⚠️ Notion not connected. Use /notion_token to connect your Notion account.');
      if (!user)
         throw new Error('User not found. Please connect Notion using /notion_token.');
    if (!user.notionToken) t
    throw new Error('Notion not connected. Use /notion_token to connect your Notion account.');
  return { notion: new Client({ auth: user.notionToken }), user };
}

/**
 * ✅ ADD TASK
 */
export async function createNotionTask(telegramId, title, description, due_date) {
  try {
    const { notion, user } = await getNotionClient(telegramId);
    let { notionDatabaseId, notionParentPageId } = user;

    // Create workspace page if missing
    if (!notionParentPageId) {
      const parentPage = await notion.pages.create({
        parent: { type: 'workspace', workspace: true },
        properties: {},
        icon: { type: 'emoji', emoji: '🧠' },
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

    // Create database if missing
    if (!notionDatabaseId) {
      const db = await notion.databases.create({
        parent: { page_id: notionParentPageId },
        title: [{ type: 'text', text: { content: 'Anvik Tasks' } }],
        properties: {
          Title: { title: {} },
          Description: { rich_text: {} },
          DueDate: { date: {} },
          Status: {
            select: {
              options: [
                { name: 'To-Do', color: 'blue' },
                { name: 'In Progress', color: 'yellow' },
                { name: 'Done', color: 'green' },
              ],
            },
          },
        },
      });

      notionDatabaseId = db.id;
      user.notionDatabaseId = notionDatabaseId;
      await user.save();
    }

    // Add the new task
    await notion.pages.create({
      parent: { database_id: notionDatabaseId },
      properties: {
        Title: { title: [{ text: { content: title || 'Untitled Task' } }] },
        Description: { rich_text: [{ text: { content: description || 'No description provided' } }] },
        DueDate: { date: { start: due_date || new Date().toISOString().split('T')[0] } },
        Status: { select: { name: 'To-Do' } },
      },
    });

    return '📝 Task added successfully to Notion.';
  } catch (error) {
    console.error('❌ Notion API error:', error.body || error.message || error);
    return '❌ Failed to add task to Notion.';
  }
}

/**
 * 📋 GET ALL TASKS
 */
export async function getNotionTasks(telegramId) {
  try {
    const { notion, user } = await getNotionClient(telegramId);
    const dbId = user.notionDatabaseId;
    if (!dbId) return '⚠️ No Notion database found. Please create a task first.';

    const response = await notion.databases.query({
      database_id: dbId,
      sorts: [{ property: 'DueDate', direction: 'ascending' }],
    });

    if (response.results.length === 0) return '📭 No tasks found.';

    let message = '🧾 *Your Tasks:*\n\n';
    for (const task of response.results) {
      const title = task.properties.Title?.title?.[0]?.plain_text || 'Untitled';
      const date = task.properties.DueDate?.date?.start || 'No date';
      const status = task.properties.Status?.select?.name || 'Unknown';
      message += `🕒 *${title}*\n📅 ${date}\n📌 Status: ${status}\n\n`;
    }
    return message;
  } catch (error) {
    console.error('❌ Fetch error:', error);
    return '❌ Failed to fetch tasks from Notion.';
  }
}

/**
 * ✏️ UPDATE TASK
 */
export async function updateNotionTask(telegramId, pageId, updates) {
  try {
    const { notion } = await getNotionClient(telegramId);
    const properties = {};

    if (updates.title)
      properties.Title = { title: [{ text: { content: updates.title } }] };
    if (updates.description)
      properties.Description = { rich_text: [{ text: { content: updates.description } }] };
    if (updates.due_date)
      properties.DueDate = { date: { start: updates.due_date } };
    if (updates.status)
      properties.Status = { select: { name: updates.status } };

    await notion.pages.update({
      page_id: pageId,
      properties,
    });

    return '✅ Task updated successfully.';
  } catch (error) {
    console.error('❌ Update error:', error);
    return '❌ Failed to update task.';
  }
}

/**
 * ❌ DELETE TASK
 */
export async function deleteNotionTask(telegramId, pageId) {
  try {
    const { notion } = await getNotionClient(telegramId);

    await notion.pages.update({
      page_id: pageId,
      archived: true,
    });

    return '🗑️ Task deleted successfully.';
  } catch (error) {
    console.error('❌ Delete error:', error);
    return '❌ Failed to delete task.';
  }
}
