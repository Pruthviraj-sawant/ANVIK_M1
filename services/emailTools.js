// FILE: services/emailTool.js
import nodemailer from "nodemailer";
import { User } from "../models/User.js";
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
