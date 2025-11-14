
// import mongoose from 'mongoose';

// const userSchema = new mongoose.Schema({
//   telegramId: { type: String, required: true, unique: true },
//   name: String,
//   createdAt: { type: Date, default: Date.now },

//   // Google OAuth tokens (Contacts + Gmail Reader)
//   google: {
//     access_token: String,
//     refresh_token: String,
//     scope: String,
//     token_type: String,
//     expiry_date: Number,
//   },

//   phoneNumber: { type: String },

//   // Notion
//   notionToken: String,
//   notionDatabaseId: String,
//   notionParentPageId: String,

//   // Email (for sending mail through SMTP)
//   email: {
//     smtp_user: String,     // user’s email address
//     smtp_pass: String,     // app-specific password (for Gmail)
//     provider: { type: String, default: "gmail" } // optional, future-proof
//   },

//   // Preferences
//   prefs: {
//     timezone: { type: String, default: 'UTC' },
//   }
// });

// export const User = mongoose.model('User', userSchema);
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  telegramId: { type: String, required: true, unique: true, index: true },

  name: String,
  createdAt: { type: Date, default: Date.now },

  // EMAIL LOGIN (OTP)
  email: { type: String, index: true },
  emailVerified: { type: Boolean, default: false },
  emailOtp: { type: String },           // MUST be String to avoid losing leading zero
  emailOtpExpires: Number,

  // GOOGLE AUTH TOKEN SET
  google: {
    access_token: String,
    refresh_token: String,
    scope: String,
    token_type: String,
    expiry_date: Number,
  },

  phoneNumber: { type: String },

  // NOTION INTEGRATION
  notionToken: String,
  notionDatabaseId: String,
  notionParentPageId: String,

  // OPTIONAL USER SMTP (IF USER SENDS EMAILS)
  emailAuth: {
    smtp_user: String,
    smtp_pass: String,
    provider: { type: String, default: "gmail" },
  },

  // USER PREFERENCES
  prefs: {
    timezone: { type: String, default: "UTC" },
  },
});

export const User = mongoose.model("User", userSchema);
