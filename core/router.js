
// import { createCalendarEvent, getGoogleAuthUrl ,getCalendarEvents } from '../services/calendarTool.js';
// import {
//   createNotionTask,
//   getNotionTasks,
//   updateNotionTask,
//   deleteNotionTask,
//   getNotionAuthUrl
// } from "../services/notionTool.js";
// import { setReminder } from '../services/reminderTool.js';
// import { User } from '../models/User.js';
// import { Agent, AgentsOrchestrator } from '../agents/index.js';
// import nodemailer from "nodemailer";
// import crypto from "crypto";

// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });


// const anvikSystemPrompt = `
// You are Anvik, an intelligent and helpful assistant for Telegram. 
// Your goal is to understand user messages, extract intents, and route them to the correct tool. 

// Guidelines:
// 1. Detect the user's intent even if they write informally, incompletely, or make mistakes.
// 2. If information is missing (like event date/time, title, or task title), politely ask for it in the "reply".

// Supported intents:

// 1. "create_event" → User wants to schedule an event (Google Calendar). 
//    - Extract:
//      - title: string
//      - start: string (date/time, natural language allowed)
//      - end: string (optional; if missing, suggest 1-hour default)
//      - description: string (optional)
//    - If title/start/end missing, ask politely in the reply.

// 2. "get_events" → User wants to view their upcoming calendar events or meetings.
//    - Trigger phrases:
//      - "show my schedule"
//      - "upcoming meetings"
//      - "today’s events"
//      - "calendar"
//      - "get my events"
//      - "what’s on my calendar"
//    - Expected output:
//      - {"intent": "get_events", "details": {}, "reply": "Fetching your upcoming events..."}

// 3. "add_task" → User wants to add a new task in Notion. 
//    - Trigger phrases:
//      - "add a task"
//      - "create task"
//      - "make a new task"
//    - Extract:
//      - title: string
//      - due_date: string (optional, e.g. "tomorrow", "2025-11-01")
//      - description: string (optional)
//    - If title missing, ask politely in the reply.

// 4. "get_tasks" → User wants to view their existing Notion tasks.
//    - Trigger phrases:
//      - "show my tasks"
//      - "get my tasks"
//      - "list my tasks"
//      - "see todo list"
//    - Expected output:
//      - {"intent": "get_tasks", "details": {}, "reply": "Fetching your tasks from Notion..."}

// 5. "update_task" → User wants to modify an existing Notion task.
//    - Trigger phrases:
//      - "update task"
//      - "edit task"
//      - "change task"
//    - Extract:
//      - pageId: string (if available)
//      - updates: object (can contain title, description, due_date, status)
//    - If pageId missing, ask politely for it.

// 6. "delete_task" → User wants to delete or remove a Notion task.
//    - Trigger phrases:
//      - "delete task"
//      - "remove task"
//      - "trash this task"
//    - Extract:
//      - pageId: string
//    - If pageId missing, ask politely for it.

// 7. "set_reminder" → User wants a reminder. 
//    - Extract:
//      - message: string
//      - time: string
//    - If message/time missing, ask politely in the reply.

// 8. "general" → Any other chat, greeting, or question. 
//    - Extract:
//      - reply: string

// Additional rules:
// - Always try to infer missing details when possible.
// - If the user asks "how to add event" or "what format to send," respond with an explanatory JSON reply.
// - Keep the "reply" friendly and helpful.

// Examples:

// User: "schedule a meeting tomorrow at 5pm"
// → {"intent":"create_event","details":{"title":"meeting","start":"tomorrow 5pm","end":"tomorrow 6pm"},"reply":"Event scheduled for tomorrow at 5 PM."}

// User: "show my calendar"
// → {"intent":"get_events","details":{},"reply":"Fetching your upcoming events..."}

// User: "add a task to finish project tomorrow"
// → {"intent":"add_task","details":{"title":"finish project","due_date":"tomorrow"},"reply":"Task 'finish project' added for tomorrow."}

// User: "show my tasks"
// → {"intent":"get_tasks","details":{},"reply":"Fetching your tasks from Notion..."}

// User: "update task abc123 status to Done"
// → {"intent":"update_task","details":{"pageId":"abc123","updates":{"status":"Done"}},"reply":"Task updated successfully."}

// User: "delete task abc123"
// → {"intent":"delete_task","details":{"pageId":"abc123"},"reply":"Task deleted successfully."}

// User: "remind me to call mom at 8pm"
// → {"intent":"set_reminder","details":{"message":"call mom","time":"8pm"},"reply":"Reminder set for 8 PM."}

// User: "hi"
// → {"intent":"general","details":{},"reply":"Hello! How can I assist you today?"}

// You are a helpful, intelligent AI assistant that can chat naturally with users. Your goal is to understand the user's intent, respond clearly, and engage in a friendly, conversational way. You should:

// 1. Adapt your tone to match the user: friendly, professional, casual, or humorous depending on context.
// 2. Always ask clarifying questions if the user's request is ambiguous.
// 3. Provide step-by-step reasoning when explaining complex topics.
// 4. Keep responses concise when appropriate, but expand with examples when necessary.
// 5. Be creative and flexible: answer questions, suggest ideas, debug code, or brainstorm with the user.
// 6. Avoid repeating information unnecessarily; assume the user wants fresh and relevant content.
// 7. If the user asks for a task like generating code, documents, or summaries, produce it efficiently and clearly.
// 8. Remember to maintain context across the conversation, responding naturally as the chat progresses.

// Always prioritize user intent and make the conversation feel smooth, natural, and helpful.

// When anyone says who made you or who is your creator, respond with:
// "I was created by a team of talented developers at Anvik — Pruthvi Sawant, Yash Ainapure, Sami Bhadgaonkar, Ayush Patil, and Diksha Sambarekar."
// `;


// // Initialize a simple main agent and orchestrator (lazy init)
// const mainAgent = new Agent({
//   name: 'AnvikCore',
//   description: 'Main brain of Anvik that routes tasks to sub-agents.',
//   systemPrompt: anvikSystemPrompt,
//   tools: [],
//   subAgents: [],
//   model: process.env.DEFAULT_LLM_MODEL || 'openai/gpt-4o-mini',
//   temperature: 0.7,
// });
// const orchestrator = new AgentsOrchestrator(mainAgent, [mainAgent]);

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
// bot.on('message', async (msg) => {
//   const lc = msg.text.toLowerCase();

//   if (lc.startsWith('connect notion')) {
//     const authUrl = getNotionAuthUrl(msg.from.id);
//     await bot.sendMessage(
//       msg.chat.id,
//       `🔗 <a href="${authUrl}">Connect your Notion workspace</a>`,
//       { parse_mode: "HTML", disable_web_page_preview: true }
//     );
//   }

  
// });






// //   if (lc.startsWith('connect notion')) {
// //     const url = await getNotionConnectUrl(telegramId);
// //     return `🔗 Connect Notion: ${url}\nOr send your Notion integration token with: \`/notion_token YOUR_TOKEN\``;
// //   }
// //   if (lc.startsWith('/notion_token') || lc.startsWith('/notion_connect')) {
// //   const parts = text.split(' ').filter(Boolean);
// //   const token = parts[1];
// //   if (!token) return 'Usage: /notion_connect <integration_token>';

// //   user.notionToken = token;
// //   await user.save();

// //   return '✅ Notion connected! The database will be created automatically when you add your first task.';
// // }


//   // 3) Use AI to detect intent
//   // const intentData = await detectIntent(text);
// // 3) Use AI to detect intent via orchestrator

// //email

// // ---------------- EMAIL LOGIN SYSTEM --------------------



// // STEP 1: User initiates login → "login email xyz@gmail.com"
// if (lc.startsWith("login email")) {
//   const parts = text.split(" ");
//   const email = parts[2];

//   if (!email) {
//     return "📧 Usage:\nlogin email your@email.com";
//   }

//   // Generate OTP
//   const otp = crypto.randomInt(100000, 999999).toString();
//   const expires = Date.now() + 5 * 60 * 1000; // 5 mins

//   user.email = email;
//   user.emailOtp = otp;
//   user.emailOtpExpires = expires;
//   await user.save();

//   // Send email
//   await transporter.sendMail({
//     to: email,
//     subject: "Your Anvik Login OTP",
//     text: `Your OTP is: ${otp}\nIt expires in 5 minutes.`,
//   });

//   return "📩 OTP sent to your email! Now use:\nverify otp 123456";
// }

// // STEP 2: Verify OTP → "verify otp 123456"
// if (lc.startsWith("verify otp")) {
//   const parts = text.split(" ");
//   const otp = parts[2];

//   if (!otp) return "🔢 Usage: verify otp 123456";

//   if (otp !== user.emailOtp) return "❌ Incorrect OTP!";
//   if (Date.now() > user.emailOtpExpires)
//     return "⏳ OTP expired. Please login email again.";

//   user.emailVerified = true;
//   user.emailOtp = null;
//   user.emailOtpExpires = null;
//   await user.save();

//   return "✅ Email login successful!";
// }

// // ---------------- END EMAIL LOGIN SYSTEM --------------------

// let intentData;
// try {
//   const raw = await orchestrator.invoke(text);

//   // Try to extract JSON from the response
//   const match = raw.match(/\{[\s\S]*\}$/);
//   intentData = match ? JSON.parse(match[0]) : { intent: "general", details: {}, reply: raw };
// } catch (err) {
//   console.error("❌ Failed to parse AI response:", err);
//   intentData = { intent: "general", details: {}, reply: "Sorry, I didn’t understand that." };
// }

// console.log("🧠 Parsed intent:", intentData);

//   switch (intentData.intent) {
//   case 'create_event':
//     if (!user.google?.access_token) {
//       const url = await getGoogleAuthUrl(telegramId);
//       return `🔗 Please connect Google Calendar first: ${url}`;
//     }
//     return await createCalendarEvent(intentData.details, telegramId);

//    case 'get_events':
//   if (!user.google?.access_token) {
//     const url = await getGoogleAuthUrl(telegramId);
//     return `🔗 Please connect Google Calendar first: ${url}`;
//   }
//   return await getCalendarEvents(telegramId);



//  case "add_task": {
//   const { title, description, due_date } = intentData.details;
//   try {
//     const result = await createNotionTask(telegramId, title, description, due_date);
//     await bot.sendMessage(telegramId, result, { parse_mode: "Markdown" });
//   } catch (err) {
//     console.error("Handler error:", err);
//     await bot.sendMessage(
//       telegramId,
//       "❌ Notion API error: ⚠️ Notion not connected. Use /notion_token to connect your Notion account."
//     );
//   }
//   break;
// }


//     /**
//      * 📋 GET ALL TASKS
//      * Example: "Show my tasks" or "Get my Notion tasks"
//      */
//     case "get_tasks": {
//       const result = await getNotionTasks(telegramId);
//       await bot.sendMessage(telegramId, result, { parse_mode: "Markdown" });
//       break;
//     }

//     /**
//      * ✏️ UPDATE TASK
//      * Example: "Update task <taskId> status to Done"
//      */
//     case "update_task": {
//       const { pageId, updates } = intentData.details;
//       const result = await updateNotionTask(telegramId, pageId, updates);
//       await bot.sendMessage(telegramId, result, { parse_mode: "Markdown" });
//       break;
//     }

//     /**
//      * ❌ DELETE TASK
//      * Example: "Delete task <taskId>"
//      */
//     case "delete_task": {
//       const { pageId } = intentData.details;
//       const result = await deleteNotionTask(telegramId, pageId);
//       await bot.sendMessage(telegramId, result, { parse_mode: "Markdown" });
//       break;
//     }


//   case 'set_reminder':
//     return await setReminder(intentData.details, telegramId, bot);

//   default:
//     return intentData.reply || "🤖 I didn't understand. Try: add task..., schedule..., set reminder...";




// }
// }
import { createCalendarEvent, getGoogleAuthUrl, getCalendarEvents } from "../services/calendarTool.js";
import {
  createNotionTask,
  getNotionTasks,
  updateNotionTask,
  deleteNotionTask,
  getNotionAuthUrl,
} from "../services/notionTool.js";


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
1. Detect the user's intent even if they write informally, incompletely, or make mistakes.
2. If information is missing (like event date/time, title, or task title), politely ask for it in the "reply".

Supported intents:

1. "create_event" → User wants to schedule an event (Google Calendar). 
   - Extract:
     - title: string
     - start: string (date/time, natural language allowed)
     - end: string (optional; if missing, suggest 1-hour default)
     - description: string (optional)
   - If title/start/end missing, ask politely in the reply.

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

8. "general" → Any other chat, greeting, or question. 
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
"I was created by a team of talented developers at Anvik — Pruthvi Sawant, Yash Ainapure, Sami Bhadgaonkar, Ayush Patil, and Diksha Sambarekar."
`;

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
    const raw = await orchestrator.invoke(text);
    const match = raw.match(/\{[\s\S]*\}$/);

    intentData = match
      ? JSON.parse(match[0])
      : { intent: "general", details: {}, reply: raw };

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

