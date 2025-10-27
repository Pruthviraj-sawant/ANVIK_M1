// // placeholder - full code provided in ChatGPT document
// /// FILE: models/User.js
// import mongoose from 'mongoose';


// const userSchema = new mongoose.Schema({
// telegramId: { type: String, required: true, unique: true },
// name: String,
// createdAt: { type: Date, default: Date.now },


// // Google OAuth tokens
// google: {
// access_token: String,
// refresh_token: String,
// scope: String,
// token_type: String,
// expiry_date: Number,
// },


// // Notion per-user tokens (users will paste token or go through OAuth depending on your Notion app setup)
// notion: {
// integration_token: String,
// database_id: String,
// },


// // Simple user preferences
// prefs: {
// timezone: { type: String, default: 'UTC' }
// }
// });
// export const User = mongoose.model('User', userSchema);
/// FILE: models/User.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  telegramId: { type: String, required: true, unique: true },
  name: String,
  createdAt: { type: Date, default: Date.now },

  // Google OAuth tokens
  google: {
    access_token: String,
    refresh_token: String,
    scope: String,
    token_type: String,
    expiry_date: Number,
  },

  // ✅ Correct Notion structure for your code
  notionToken: String,              // user's Notion integration token
  notionDatabaseId: String,         // the created database ID
  notionParentPageId: String,       // the created workspace page ID

  // Preferences
  prefs: {
    timezone: { type: String, default: 'UTC' },
  },
});

export const User = mongoose.model('User', userSchema);
