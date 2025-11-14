// FILE: services/email/sendEmail.js
import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import { getOAuthClientForUserTokens } from '../../utils/googleAuth.js';
import { User } from '../../models/User.js';
import MailComposer from 'nodemailer/lib/mail-composer'; // used if using Gmail API

// Helper: send via SMTP with stored SMTP creds (gmail app password)
async function sendViaSMTP(userEmail, appPassword, to, subject, body) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: userEmail, pass: appPassword }
  });
  await transporter.sendMail({ from: userEmail, to, subject, text: body });
}

// Helper: send via Gmail API (requires proper scope)
async function sendViaGmailAPI(oauth2Client, from, to, subject, body) {
  // create RFC822 message
  const mail = new MailComposer({
    from,
    to,
    subject,
    text: body
  });

  const message = await new Promise((resolve, reject) => {
    mail.compile().build((err, msg) => {
      if (err) return reject(err);
      resolve(msg);
    });
  });

  const encoded = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encoded }
  });
}

export async function sendEmail({ to, subject, body }, telegramId) {
  const user = await User.findOne({ telegramId });
  if (!user) return 'User not found';

  // If user provided SMTP creds
  if (user.email?.smtp_user && user.email?.smtp_pass) {
    try {
      await sendViaSMTP(user.email.smtp_user, user.email.smtp_pass, to, subject, body);
      return 'Email sent via SMTP successfully.';
    } catch (err) {
      console.error('SMTP send error:', err);
      // fallthrough to try Gmail API
    }
  }

  // Try Gmail API using OAuth tokens
  if (user?.google?.refresh_token || user?.google?.access_token) {
    try {
      const oauth2Client = getOAuthClientForUserTokens(user.google);
      const from = user.email?.smtp_user || (user.google?.email || 'me'); // best effort
      await sendViaGmailAPI(oauth2Client, from, to, subject, body);
      return 'Email sent via Gmail API successfully.';
    } catch (err) {
      console.error('Gmail API send error:', err);
      return `Failed to send email: ${err.message || err}`;
    }
  }

  return '⚠️ No email credentials found. Connect SMTP via /connect_email or Google via "connect google"';
}
