// FILE: services/emailTool.js
import nodemailer from "nodemailer";
import { User } from "../models/User.js";
import { google } from "googleapis";

console.log("SMTP_USER:", process.env.SMTP_USER);
console.log("SMTP_PASS:", process.env.SMTP_PASS ? "LOADED" : "NOT LOADED");

// -------------------------------------
// STEP 1: SEND OTP TO USER EMAIL (SMTP)
// -------------------------------------
export async function sendLoginOtp(telegramId, email) {
  if (!email) return "❌ Please enter a valid email.";

  const otp = Math.floor(100000 + Math.random() * 900000);
  const expiry = Date.now() + 5 * 60 * 1000;

  await User.findOneAndUpdate(
    { telegramId },
    {
      email,
      emailOtp: otp,
      emailOtpExpires: expiry,
    },
    { upsert: true }
  );

  // CORRECTED: Use SMTP_USER & SMTP_PASS
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Anvik Assistant" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Your Anvik Login OTP",
    text: `Your OTP is: ${otp}\nValid for 5 minutes.`,
  });

  return `📩 OTP sent to *${email}*.\nPlease enter: \`verify otp <code>\``;
}

// -------------------------------------
// STEP 2: VERIFY OTP
// -------------------------------------
export async function verifyLoginOtp(telegramId, enteredOtp) {
  const user = await User.findOne({ telegramId });

  if (!user) return "⚠️ User not found.";
  if (!user.emailOtp) return "❌ No OTP generated.";
  if (Date.now() > user.emailOtpExpires)
    return "⏳ OTP expired. Send again: login email <your email>";

  if (String(user.emailOtp) !== String(enteredOtp))
    return "❌ Invalid OTP.";

  user.emailVerified = true;
  user.emailOtp = null;
  user.emailOtpExpires = null;
  await user.save();

  return `🎉 Email *${user.email}* verified successfully!`;
}

// -------------------------------------
// STEP 3: SEND EMAIL USING USER'S GMAIL (OAuth2)
// -------------------------------------


export async function sendUserEmail(telegramId, to, subject, body) {
  const user = await User.findOne({ telegramId });

  if (!user?.emailVerified)
    return "⚠️ Verify email first: `login email <your email>`";

  // FIX: No OAuth2, use your Gmail App Password
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,  // App Password
    },
  });

  await transporter.sendMail({
    from: `"Anvik Assistant" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text: body,
  });

  return `📤 Email sent to *${to}* successfully!`;
}

export async function getRecentEmails(telegramId, max = 10) {
  const user = await User.findOne({ telegramId });
  if (!user?.google?.access_token)
    return "⚠️ Connect Google first using: connect google";

  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oAuth2Client.setCredentials({
    access_token: user.google.access_token,
    refresh_token: user.google.refresh_token,
  });

  const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

  // Fetch message IDs
  const res = await gmail.users.messages.list({
    userId: "me",
    maxResults: max,
  });

  if (!res.data.messages?.length) return "📭 No recent emails found.";

  let emailList = "📥 *Your Recent Emails:*\n\n";

  for (const msg of res.data.messages) {
    const fullMsg = await gmail.users.messages.get({
      userId: "me",
      id: msg.id,
      format: "metadata",
      metadataHeaders: ["Subject", "From", "Date"],
    });

    const headers = fullMsg.data.payload.headers;

    const subject = headers.find((h) => h.name === "Subject")?.value || "(No Subject)";
    const from = headers.find((h) => h.name === "From")?.value || "(Unknown)";
    const date = headers.find((h) => h.name === "Date")?.value || "";

    emailList += `📧 *${subject}*\nFrom: ${from}\nDate: ${date}\n\n`;
  }

  return emailList;
}