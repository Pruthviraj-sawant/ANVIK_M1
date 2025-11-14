// FILE: services/email/readEmails.js
import { google } from 'googleapis';
import { getOAuthClientForUserTokens } from '../../utils/googleAuth.js';
import { User } from '../../models/User.js';

function toUnixSeconds(dateStr) {
  const t = new Date(dateStr);
  if (isNaN(t)) throw new Error('Invalid date format, use ISO format');
  return Math.floor(t.getTime() / 1000);
}

export async function readEmails(from_date, to_date, telegramId, fromEmail = null) {
  if (!from_date || !to_date) return 'Provide from_date and to_date in ISO format';
  const user = await User.findOne({ telegramId });
  if (!user?.google?.refresh_token && !user?.google?.access_token) {
    return '⚠️ Please connect Google first using "connect google"';
  }

  try {
    const oauth2Client = getOAuthClientForUserTokens(user.google);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const after = toUnixSeconds(from_date);
    const before = toUnixSeconds(to_date);

    let query = `after:${after} before:${before}`;
    if (fromEmail) query += ` from:${fromEmail}`;

    const list = await gmail.users.messages.list({ userId: 'me', q: query });
    const messages = list.data.messages || [];
    if (!messages.length) return 'No emails found in the specified range';

    const out = [];
    for (const m of messages.slice(0, 20)) { // limit to 20 to avoid huge loops
      const full = await gmail.users.messages.get({ userId: 'me', id: m.id });
      const headers = full.data.payload?.headers || [];
      const get = (name) => headers.find(h => h.name === name)?.value || '';
      out.push({
        from: get('From'),
        subject: get('Subject'),
        date: get('Date'),
        snippet: full.data.snippet || ''
      });
    }

    return JSON.stringify(out, null, 2);
  } catch (err) {
    console.error('readEmails error:', err);
    return `Gmail API error: ${err.message || err}`;
  }
}
