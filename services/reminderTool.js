import { User } from '../models/User.js';

const reminders = []; // ← Must be here

export async function setReminder(details, telegramId, bot) {
  let at;
  const timeStr = details.time.trim();
  const now = new Date();

  const match24 = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    let hours = Number(match24[1]);
    let minutes = Number(match24[2]);
    at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
    if (at.getTime() < Date.now()) at.setDate(at.getDate() + 1);
  } else {
    const match12 = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match12) {
      let hours = Number(match12[1]);
      const minutes = Number(match12[2]);
      const meridiem = match12[3].toUpperCase();
      if (meridiem === 'PM' && hours < 12) hours += 12;
      if (meridiem === 'AM' && hours === 12) hours = 0;
      at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
      if (at.getTime() < Date.now()) at.setDate(at.getDate() + 1);
    } else {
      return '⚠️ Invalid time format. Use HH:MM or h:mm AM/PM';
    }
  }

  const id = reminders.push({ telegramId, at: at.getTime(), message: details.message }) - 1;

  const delay = at.getTime() - Date.now();
  setTimeout(async () => {
    try {
      const user = await User.findOne({ telegramId });
      if (!user) return;
      await bot.sendMessage(Number(telegramId), `⏰ Reminder: ${details.message}`);
    } catch (e) {
      console.error('Reminder send failed', e);
    }
  }, delay);

  return `⏰ Reminder scheduled for ${at.toLocaleString()}.`;
}
