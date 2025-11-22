
// FILE: services/calendarTool.js


import moment from 'moment-timezone';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import { User } from '../models/User.js';

dotenv.config();


import { parse, formatISO, isValid } from 'date-fns';

// Converts user-friendly date to ISO 8601 for Google Calendar
function toISO(dateStr, userTimeZone) {
  if (!dateStr) return null;

  // Use guessed timezone if not provided
  const timeZone = userTimeZone || moment.tz.guess();

  // Try parsing date + time like "26 Oct 2025 12 PM"
  let m = moment.tz(dateStr, ['DD MMM YYYY h A', 'DD MMM YYYY H:mm', 'DD MMM YYYY'], timeZone);

  if (!m.isValid()) {
    // fallback: parse any moment-supported formats
    m = moment.tz(dateStr, timeZone);
  }

  if (!m.isValid()) return null;

  // If only date is provided (no time), set default 10:00 AM
  if (!/(\d{1,2}:\d{2}|\b\d{1,2}\s*(AM|PM)\b)/i.test(dateStr)) {
    m.set({ hour: 10, minute: 0, second: 0 });
  }

  return m.format(); // ISO 8601 string with timezone
}



const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || `${process.env.BASE_URL}/auth/google/callback`
);

export async function getGoogleAuthUrl(telegramId) {
  // ✅ Correct parameter names
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email',
      "https://www.googleapis.com/auth/gmail.readonly",   // 👈 REQUIRED
  "https://www.googleapis.com/auth/gmail.modify"
    ],
    state: telegramId,
    response_type: 'code', // ✅ explicitly add this
  });

  console.log('Generated Google Auth URL:', url);
  return url;
}

export async function handleGoogleCallback(code, stateTelegramId) {
  const { tokens } = await oauth2Client.getToken(code);

  await User.findOneAndUpdate(
    { telegramId: String(stateTelegramId) },
    { google: tokens },
    { upsert: true }
  );
}

export async function createCalendarEvent(details, telegramId) {
  try {
    const user = await User.findOne({ telegramId });
    if (!user?.google) return '⚠️ Please connect your Google account first using: /connect google';

    oauth2Client.setCredentials(user.google);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const userTimeZone = moment.tz.guess();
    const startTime = toISO(details.start, userTimeZone);
    
    // If no end time is provided, default to 1 hour after start
    let endTime = details.end ? toISO(details.end, userTimeZone) : null;
    if (!endTime && startTime) {
      const startMoment = moment(startTime);
      endTime = startMoment.add(1, 'hour').format();
    }

    // If it's an all-day event (like a birthday), use date instead of dateTime
    const isAllDay = details.isAllDay || 
                   (details.title && details.title.toLowerCase().includes('birthday'));

    const event = {
      summary: details.title || 'New Event',
      description: details.description || 'Created by Anvik Assistant',
      start: {
        [isAllDay ? 'date' : 'dateTime']: isAllDay ? moment(startTime).format('YYYY-MM-DD') : startTime,
        timeZone: userTimeZone
      },
      end: {
        [isAllDay ? 'date' : 'dateTime']: isAllDay ? 
          moment(startTime).add(1, 'day').format('YYYY-MM-DD') : 
          endTime,
        timeZone: userTimeZone
      }
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event
    });

    // Format a nice response with the event details
    const eventLink = response.data.htmlLink;
    const eventSummary = response.data.summary;
    const eventStart = response.data.start.dateTime || response.data.start.date;
    
    return `✅ Event created successfully!\n\n` +
           `📅 *${eventSummary}*\n` +
           `⏰ ${eventStart}\n` +
           `🔗 [View in Calendar](${eventLink})`;

  } catch (error) {
    console.error('Error creating calendar event:', error);
    if (error.response?.data?.error) {
      return `❌ Error: ${error.response.data.error.message || 'Failed to create event'}`;
    }
    return '❌ An error occurred while creating the event. Please try again.';
  }
}

export async function getCalendarEvents(telegramId, maxResults = 5) {
  const user = await User.findOne({ telegramId });
  if (!user?.google) return '⚠️ Google account not connected.';

  oauth2Client.setCredentials(user.google);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  // Get current date/time in ISO
  const now = new Date().toISOString();

  // Fetch upcoming events
  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: now,
    maxResults,
    singleEvents: true,
    orderBy: 'startTime',
  });

  const events = res.data.items;
  if (!events.length) return '📭 No upcoming events found.';

  // Format event list nicely
  let message = '📅 *Your Upcoming Events:*\n\n';
  for (const e of events) {
    const start = e.start.dateTime || e.start.date;
    const end = e.end.dateTime || e.end.date;
    message += `🕒 *${e.summary || 'Untitled Event'}*\n📆 ${start} → ${end}\n\n`;
  }

  return message;
}
