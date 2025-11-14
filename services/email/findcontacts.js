// FILE: services/email/findContacts.js
import { google } from 'googleapis';
import { getOAuthClientForUserTokens } from '../../utils/googleAuth.js';
import { User } from '../../models/User.js';

/**
 * Find contact email by name for a given telegramId.
 * Returns string (JSON) or error message.
 */
export async function findContactEmail(name, telegramId) {
  if (!name) return 'Provide a name';
  const user = await User.findOne({ telegramId });
  if (!user?.google?.refresh_token && !user?.google?.access_token) {
    return '⚠️ Please connect Google first using "connect google"';
  }

  try {
    // Build oauth client with stored tokens
    const oauth2Client = getOAuthClientForUserTokens(user.google);
    const people = google.people({ version: 'v1', auth: oauth2Client });

    const res = await people.people.searchContacts({
      query: name,
      readMask: 'names,emailAddresses,phoneNumbers'
    });

    const results = res.data.results || [];
    if (!results.length) return `No contact found with the name: ${name}`;

    const matches = results.map(r => {
      const person = r.person || {};
      return {
        name: person.names?.[0]?.displayName || 'Unknown',
        emails: (person.emailAddresses || []).map(e => e.value),
        phone_numbers: (person.phoneNumbers || []).map(p => p.value)
      };
    });

    return JSON.stringify(matches, null, 2);
  } catch (err) {
    console.error('findContactEmail error:', err);
    return `Google People API error: ${err.message || err}`;
  }
}
