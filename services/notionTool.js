// FILE: services/notionTool.js
import { Client } from "@notionhq/client";
import { User } from "../models/User.js";
import dotenv from "dotenv";
dotenv.config();

/**
 * -------------------------------------
 *  NOTION AUTH URL
 * -------------------------------------
 */
export function getNotionAuthUrl(telegramId) {
  const params = new URLSearchParams({
    client_id: process.env.NOTION_CLIENT_ID,
    response_type: "code",
    owner: "user",
    redirect_uri: process.env.NOTION_REDIRECT_URI,
    state: `tg_${telegramId}`,
  });

  return `https://api.notion.com/v1/oauth/authorize?${params}`;
}

/**
 * -------------------------------------
 *  CREATE NOTION CLIENT PER USER
 * -------------------------------------
 */
export async function getNotionClient(telegramId) {
  const user = await User.findOne({ telegramId: String(telegramId) });

  if (!user?.notionToken) throw new Error("⚠️ Notion not connected!");

  return {
    notion: new Client({
      auth: user.notionToken,
      notionVersion: "2022-06-28"
    }),
    user
  };
}


/**
 * -------------------------------------
 *  ENSURE PARENT PAGE (workspace)
 * -------------------------------------
 */
async function ensureParentPage(notion, user) {
  if (user.notionParentPageId) return user.notionParentPageId;

  const parentPage = await notion.pages.create({
    parent: { type: "workspace", workspace: true },
    icon: { type: "emoji", emoji: "🧠" },
    properties: {
      title: {
        title: [{ type: "text", text: { content: "Anvik Workspace" } }],
      },
    },
    children: [
      {
        object: "block",
        type: "heading_1",
        heading_1: {
          rich_text: [
            {
              type: "text",
              text: { content: "Welcome to your Anvik Workspace 👋" },
            },
          ],
        },
      },
    ],
  });

  user.notionParentPageId = parentPage.id;
  await user.save();
  console.log("✓ Parent Page Created:", parentPage.id);

  return parentPage.id;
}

/**
 * -------------------------------------
 *  ENSURE DATABASE
 * -------------------------------------
 */
async function ensureDatabase(notion, user, parentPageId) {
  if (user.notionDatabaseId) return user.notionDatabaseId;

  const db = await notion.databases.create({
    parent: {
      type: "page_id",
      page_id: parentPageId,
    },
    title: [{ type: "text", text: { content: "Anvik Tasks" } }],
    properties: {
      Title: { title: {} },
      Description: { rich_text: {} },
      DueDate: { date: {} },
      Status: {
        select: {
          options: [
            { name: "To-Do", color: "blue" },
            { name: "In Progress", color: "yellow" },
            { name: "Done", color: "green" },
          ],
        },
      },
    },
  });

  user.notionDatabaseId = db.id;
  await user.save();
  console.log("✓ Database Created:", db.id);

  return db.id;
}

/**
 * -------------------------------------
 *  CREATE A TASK
 * -------------------------------------
 */
export async function createNotionTask(telegramId, title, description, dueDate) {
  try {
    const { notion, user } = await getNotionClient(telegramId);

    const parentPageId = await ensureParentPage(notion, user);
    const databaseId = await ensureDatabase(notion, user, parentPageId);

    await notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        Title: { title: [{ text: { content: title || "Untitled Task" } }] },
        Description: {
          rich_text: [
            {
              text: { content: description || "No description provided" },
            },
          ],
        },
        DueDate: {
          date: {
            start: dueDate || new Date().toISOString().split("T")[0],
          },
        },
        Status: { select: { name: "To-Do" } },
      },
    });

    return "✅ Task added successfully!";
  } catch (error) {
    console.error("❌ Notion Error:", error.body || error.message);
    return "❌ Failed to add task.";
  }
}

/**
 * -------------------------------------
 *  GET ALL TASKS
 * -------------------------------------
 */
export async function getNotionTasks(telegramId) {
  try {
    const { notion, user } = await getNotionClient(telegramId);

    if (!user.notionDatabaseId) return "⚠️ No tasks found.";

    const response = await notion.databases.query({
      database_id: user.notionDatabaseId,
      sorts: [{ property: "DueDate", direction: "ascending" }],
    });

    if (response.results.length === 0) return "📭 No tasks found.";

    let msg = "🧾 *Your Tasks:*\n\n";

    for (const task of response.results) {
      const title = task.properties.Title?.title?.[0]?.plain_text || "Untitled";
      const date = task.properties.DueDate?.date?.start || "No date";
      const status = task.properties.Status?.select?.name || "Unknown";

      msg += `📝 *${title}*\n📅 ${date}\n📌 Status: ${status}\n\n`;
    }

    return msg;
  } catch (error) {
    console.error("❌ Fetch Error:", error);
    return "❌ Failed to fetch tasks.";
  }
}

/**
 * -------------------------------------
 *  UPDATE A TASK
 * -------------------------------------
 */
export async function updateNotionTask(telegramId, pageId, updates) {
  try {
    const { notion } = await getNotionClient(telegramId);

    const properties = {};

    if (updates.title)
      properties.Title = { title: [{ text: { content: updates.title } }] };

    if (updates.description)
      properties.Description = {
        rich_text: [{ text: { content: updates.description } }],
      };

    if (updates.due_date)
      properties.DueDate = { date: { start: updates.due_date } };

    if (updates.status)
      properties.Status = { select: { name: updates.status } };

    await notion.pages.update({
      page_id: pageId,
      properties,
    });

    return "✅ Task updated successfully!";
  } catch (error) {
    console.error("❌ Update Error:", error);
    return "❌ Failed to update task.";
  }
}

/**
 * -------------------------------------
 *  DELETE (ARCHIVE) TASK
 * -------------------------------------
 */
export async function deleteNotionTask(telegramId, pageId) {
  try {
    const { notion } = await getNotionClient(telegramId);

    await notion.pages.update({
      page_id: pageId,
      archived: true,
    });

    return "🗑️ Task deleted successfully!";
  } catch (error) {
    console.error("❌ Delete Error:", error);
    return "❌ Failed to delete task.";
  }
}
