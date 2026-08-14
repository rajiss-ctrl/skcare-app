// scripts/seedGuest.js
// ─────────────────────────────────────────────────────────────────────────────
// Creates one shared guest account used by the "Continue as Guest" button.
// The frontend signs in with these fixed credentials — no new document is
// created per click. The guest can still convert to a real account at checkout.
//
// Run once:
//   npm run seed:guest
//
// Required env vars:
//   GUEST_EMAIL    — e.g. guest@skcare.com
//   GUEST_PASSWORD — a valid password (will be hashed)
//   GUEST_NAME     — display name shown in the UI
// ─────────────────────────────────────────────────────────────────────────────

require('dotenv').config();
const mongoose = require('mongoose');
const User     = require('../models/Users');

const {
  MONGO_URI,
  GUEST_EMAIL,
  GUEST_PASSWORD,
  GUEST_NAME,
} = process.env;

// ── Validate ──────────────────────────────────────────────────────────────────
const missing = [];
if (!MONGO_URI)       missing.push('MONGO_URI');
if (!GUEST_EMAIL)     missing.push('GUEST_EMAIL');
if (!GUEST_PASSWORD)  missing.push('GUEST_PASSWORD');
if (!GUEST_NAME)      missing.push('GUEST_NAME');

if (missing.length) {
  console.error(`\n❌ Missing required environment variables:\n   ${missing.join(', ')}\n`);
  process.exit(1);
}

// ── Seed ──────────────────────────────────────────────────────────────────────
const seed = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB connected');

  const existing = await User.findOne({ email: GUEST_EMAIL.toLowerCase() });

  if (existing) {
    if (existing.isGuest) {
      console.log(`\nℹ️  Guest account already exists: ${existing.email}`);
      console.log('   No changes made.\n');
    } else {
      // Account exists but is not a guest — update it to be the shared guest account
      existing.isGuest    = true;
      existing.roles      = ['user'];
      existing.isVerified = true;
      await existing.save();
      console.log(`\n✅ Existing account updated to shared guest: ${existing.email}\n`);
    }
    await mongoose.disconnect();
    return;
  }

  // Create the shared guest account
  const guest = await User.create({
    email:      GUEST_EMAIL.toLowerCase().trim(),
    password:   GUEST_PASSWORD,   // pre-save hook hashes it
    name:       GUEST_NAME.trim(),
    roles:      ['user'],
    isGuest:    true,
    isVerified: true,
  });

  console.log('\n🎉 Guest account created successfully!');
  console.log('─────────────────────────────────────');
  console.log(`   ID       : ${guest._id}`);
  console.log(`   Name     : ${guest.name}`);
  console.log(`   Email    : ${guest.email}`);
  console.log(`   Password : ${GUEST_PASSWORD}  ← store this safely`);
  console.log('─────────────────────────────────────');
  console.log('\n   The frontend uses these credentials for "Continue as Guest".\n');

  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  mongoose.disconnect();
  process.exit(1);
});
