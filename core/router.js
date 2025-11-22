import { createCalendarEvent, getGoogleAuthUrl, getCalendarEvents } from "../services/calendarTool.js";
import {
  createNotionTask,
  getNotionTasks,
  updateNotionTask,
  deleteNotionTask,
  getNotionAuthUrl,
} from "../services/notionTool.js";

import { getRecentEmails } from "../services/emailTools.js";

import { setReminder } from "../services/reminderTool.js";
import { User } from "../models/User.js";
import { Agent, AgentsOrchestrator } from "../agents/index.js";
import nodemailer from "nodemailer";
import crypto from "crypto";

// ---------------- EMAIL TRANSPORTER ----------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ---------------- SYSTEM PROMPT ----------------

const anvikSystemPrompt = `
You are Anvik, an intelligent and helpful assistant for Telegram. 
Your goal is to understand user messages, extract intents, and route them to the correct tool. 

Guidelines:
1. Be friendly, conversational, and helpful in your responses.
2. When creating events, be smart about interpreting dates and times:
   - If only a date is given, assume 10:00 AM as default start time
   - If no end time is specified, assume 1 hour duration
   - For all-day events, use the date format YYYY-MM-DD without time
   - Support natural language dates like "tomorrow at 3pm" or "next Monday"
3. For event creation, try to extract as much information as possible from the initial message.

Supported intents:

1. "create_event" → User wants to schedule an event (Google Calendar). 
   - Extract:
     - title: string (required, e.g., "Team Meeting")
     - start: string (date/time in natural language, e.g., "tomorrow at 2pm" or "2025-12-25T14:00:00")
     - end: string (optional; if missing, calculate based on start + 1 hour)
     - description: string (optional, additional details about the event)
     - isAllDay: boolean (set to true for all-day events)
   - If title or start is missing, ask for it in a friendly way
   - When asking for missing info, be conversational and suggest examples

2. "get_events" → User wants to view their upcoming calendar events or meetings.
   - Trigger phrases:
     - "show my schedule"
     - "upcoming meetings"
     - "today’s events"
     - "calendar"
     - "get my events"
     - "what’s on my calendar"
   - Expected output:
     - {"intent": "get_events", "details": {}, "reply": "Fetching your upcoming events..."}

3. "add_task" → User wants to add a new task in Notion. 
   - Trigger phrases:
     - "add a task"
     - "create task"
     - "make a new task"
   - Extract:
     - title: string
     - due_date: string (optional, e.g. "tomorrow", "2025-11-01")
     - description: string (optional)
   - If title missing, ask politely in the reply.

4. "get_tasks" → User wants to view their existing Notion tasks.
   - Trigger phrases:
     - "show my tasks"
     - "get my tasks"
     - "list my tasks"
     - "see todo list"
   - Expected output:
     - {"intent": "get_tasks", "details": {}, "reply": "Fetching your tasks from Notion..."}

5. "update_task" → User wants to modify an existing Notion task.
   - Trigger phrases:
     - "update task"
     - "edit task"
     - "change task"
   - Extract:
     - pageId: string (if available)
     - updates: object (can contain title, description, due_date, status)
   - If pageId missing, ask politely for it.

6. "delete_task" → User wants to delete or remove a Notion task.
   - Trigger phrases:
     - "delete task"
     - "remove task"
     - "trash this task"
   - Extract:
     - pageId: string
   - If pageId missing, ask politely for it.

7. "set_reminder" → User wants a reminder. 
   - Extract:
     - message: string
     - time: string
   - If message/time missing, ask politely in the reply.

8. "get_emails" → User wants to check recent emails.
   - Trigger phrases:
     - "show my emails"
     - "check emails"
     - "get my mails"
     - "latest emails"
   - Expected output:
     - {"intent": "get_emails", "details": {}, "reply": "Fetching your recent emails..."}

9. "general" → Any other chat, greeting, or question. 
   - Extract:
     - reply: string

Additional rules:
- Always try to infer missing details when possible.
- If the user asks "how to add event" or "what format to send," respond with an explanatory JSON reply.
- Keep the "reply" friendly and helpful.

Examples:

User: "schedule a meeting tomorrow at 5pm"
→ {"intent":"create_event","details":{"title":"meeting","start":"tomorrow 5pm","end":"tomorrow 6pm"},"reply":"Event scheduled for tomorrow at 5 PM."}

User: "show my calendar"
→ {"intent":"get_events","details":{},"reply":"Fetching your upcoming events..."}

User: "add a task to finish project tomorrow"
→ {"intent":"add_task","details":{"title":"finish project","due_date":"tomorrow"},"reply":"Task 'finish project' added for tomorrow."}

User: "show my tasks"
→ {"intent":"get_tasks","details":{},"reply":"Fetching your tasks from Notion..."}

User: "update task abc123 status to Done"
→ {"intent":"update_task","details":{"pageId":"abc123","updates":{"status":"Done"}},"reply":"Task updated successfully."}

User: "delete task abc123"
→ {"intent":"delete_task","details":{"pageId":"abc123"},"reply":"Task deleted successfully."}

User: "remind me to call mom at 8pm"
→ {"intent":"set_reminder","details":{"message":"call mom","time":"8pm"},"reply":"Reminder set for 8 PM."}

User: "get my mails"
→ {"intent":"get_emails","details":{},"reply":"Fetching your recent emails..."}

User: "hi"
→ {"intent":"general","details":{},"reply":"Hello! How can I assist you today?"}

You are a helpful, intelligent AI assistant that can chat naturally with users. Your goal is to understand the user's intent, respond clearly, and engage in a friendly, conversational way. You should:

1. Adapt your tone to match the user: friendly, professional, casual, or humorous depending on context.
2. Always ask clarifying questions if the user's request is ambiguous.
3. Provide step-by-step reasoning when explaining complex topics.
4. Keep responses concise when appropriate, but expand with examples when necessary.
5. Be creative and flexible: answer questions, suggest ideas, debug code, or brainstorm with the user.
6. Avoid repeating information unnecessarily; assume the user wants fresh and relevant content.
7. If the user asks for a task like generating code, documents, or summaries, produce it efficiently and clearly.
8. Remember to maintain context across the conversation, responding naturally as the chat progresses.

Always prioritize user intent and make the conversation feel smooth, natural, and helpful.

When anyone says who made you or who is your creator, respond with:
"I was created by a team of talented developers at Anvik — Pruthvi Sawant, Yash Ainapure, Sami Bhadgaonkar, Ayush Patil, and Diksha Sambarekar."`;

// // Initialize a simple main agent and orchestrator (lazy init)
// ---------------- AGENT SETUP ----------------
// ===================================================
// 🔥 MAIN AGENT + ORCHESTRATOR
// ===================================================
const mainAgent = new Agent({
  name: "AnvikCore",
  description: "Main brain of Anvik that routes tasks to sub-agents.",
  systemPrompt: anvikSystemPrompt,
  tools: [],
  subAgents: [],
  model: process.env.DEFAULT_LLM_MODEL || "openai/gpt-4o-mini",
  temperature: 0.7,
});

const orchestrator = new AgentsOrchestrator(mainAgent, [mainAgent]);

// Import the new email system
import {
  sendLoginOtp,
  verifyLoginOtp,
  sendUserEmail,
} from "../services/emailTools.js";

// ===================================================
// 🔥 MAIN REQUEST ROUTER
// ===================================================
export async function routeRequest(text, telegramId, bot) {
  if (!text || typeof text !== "string") {
    return "⚠️ Empty message received.";
  }

  const lc = text.trim().toLowerCase();

  // 1) Fetch or create user
  let user = await User.findOne({ telegramId });
  if (!user) user = await User.create({ telegramId });

  // ===================================================
  // 🔥 EMAIL LOGIN SYSTEM (Using emailTools.js)
  // ===================================================

  // SEND LOGIN OTP
  if (lc.startsWith("login email")) {
    const email = text.split(" ")[2];
    if (!email) return "📧 Usage: login email your@email.com";

    return await sendLoginOtp(telegramId, email); // ⬅ uses new logic
  }

  // VERIFY LOGIN OTP
  if (lc.startsWith("verify otp")) {
    const otp = text.split(" ")[2];
    if (!otp) return "🔢 Usage: verify otp 123456";

    return await verifyLoginOtp(telegramId, otp); // ⬅ new logic
  }

  // ===================================================
// 🔥 EMAIL SEND (USER TRIGGERED)
// ===================================================
if (lc.startsWith("send email")) {
  const parts = text.split(" ");

  if (parts.length < 4)
    return "✉️ Usage:\nsend email receiver@gmail.com your message";

  const to = parts[2];
  const body = parts.slice(3).join(" ");

  const subject = "Message from Anvik";

  return await sendUserEmail(telegramId, to, subject, body);
}


// FETCH RECENT EMAILS
if (lc.startsWith("my emails")) {
  return await getRecentEmails(telegramId, 5);
}

  // ===================================================
  // 🔥 NOTION LOGIN
  // ===================================================
  if (lc.startsWith("connect notion")) {
    const authUrl = getNotionAuthUrl(telegramId);
    return `🔗 Connect Notion: ${authUrl}`;
  }

  // ===================================================
  // 🔥 GOOGLE LOGIN
  // ===================================================
  if (lc.startsWith("connect google")) {
    const url = await getGoogleAuthUrl(telegramId);
    return `🔗 Authorize Google Calendar: ${url}`;
  }

  // ===================================================
  // 🔥 AI INTENT EXTRACTION
  // ===================================================
  let intentData;
  try {
    // Pre-process the text to handle common event creation patterns
    let processedText = text.trim();
    
    // Common patterns for event creation
    if (processedText.toLowerCase().includes('birthday') || 
        processedText.toLowerCase().includes('event') ||
        processedText.toLowerCase().includes('meeting') ||
        processedText.toLowerCase().includes('remind me') ||
        processedText.toLowerCase().includes('schedule')) {
      
      // Add context if the message looks like an event but is missing details
      if (!processedText.match(/\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}/) && // No date
          !processedText.match(/\b(?:tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week|next month)\b/i)) {
        processedText = `Create an event: ${processedText}`;
      }
    }

    const raw = await orchestrator.invoke(processedText);
    let match = raw.match(/\{[\s\S]*\}$/);
    
    // If no JSON found, try to handle it as a simple event creation
    if (!match) {
      if (processedText.toLowerCase().includes('birthday') || 
          processedText.toLowerCase().includes('event')) {
        intentData = {
          intent: "create_event",
          details: {
            title: processedText,
            start: new Date().toISOString(),
            description: "Created by Anvik Assistant"
          },
          reply: `I'll help you create an event for: ${processedText}`
        };
      } else {
        intentData = { intent: "general", details: {}, reply: raw };
      }
    } else {
      intentData = JSON.parse(match[0]);
    }

  } catch (err) {
    console.error("Intent parse error:", err);
    intentData = {
      intent: "general",
      details: {},
      reply: "Sorry, I didn’t understand that.",
    };
  }

  // ===================================================
  // 🔥 INTENT ROUTING
  // ===================================================
  switch (intentData.intent) {
    case "create_event":
      if (!user.google?.access_token) {
        const url = await getGoogleAuthUrl(telegramId);
        return `🔗 Connect Google Calendar first: ${url}`;
      }
      return await createCalendarEvent(intentData.details, telegramId);

    case "get_events":
      if (!user.google?.access_token) {
        const url = await getGoogleAuthUrl(telegramId);
        return `🔗 Connect Google Calendar first: ${url}`;
      }
      return await getCalendarEvents(telegramId);

    case "add_task":
      return await bot.sendMessage(
        telegramId,
        await createNotionTask(
          telegramId,
          intentData.details.title,
          intentData.details.description,
          intentData.details.due_date
        ),
        { parse_mode: "Markdown" }
      );

    case "get_tasks":
      return await bot.sendMessage(
        telegramId,
        await getNotionTasks(telegramId),
        { parse_mode: "Markdown" }
      );

    case "update_task":
      return await bot.sendMessage(
        telegramId,
        await updateNotionTask(
          telegramId,
          intentData.details.pageId,
          intentData.details.updates
        ),
        { parse_mode: "Markdown" }
      );

    case "delete_task":
      return await bot.sendMessage(
        telegramId,
        await deleteNotionTask(
          telegramId,
          intentData.details.pageId
        ),
        { parse_mode: "Markdown" }
      );

    case "set_reminder":
      return await setReminder(intentData.details, telegramId, bot);

    default:
      return intentData.reply || "🤖 I didn’t understand that.";
  }
}

