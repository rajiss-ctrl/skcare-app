// scripts/seedSuperAdmin.js
// ─────────────────────────────────────────────────────────────────────────────
// Run once to create the superadmin account:
//   npm run seed:superadmin
//
// Credentials are read from .env so they are never committed to source control.
// Required env vars:
//   SUPERADMIN_EMAIL    — e.g. superadmin@skcare.com
//   SUPERADMIN_PASSWORD — strong password (min 8 chars, upper, number, special)
//   SUPERADMIN_NAME     — display name
// ─────────────────────────────────────────────────────────────────────────────

require('dotenv').config();
const mongoose = require('mongoose');
const User     = require('../models/Users');

const {
  MONGO_URI,
  SUPERADMIN_EMAIL,
  SUPERADMIN_PASSWORD,
  SUPERADMIN_NAME,
} = process.env;

// ── Validate env vars before connecting ───────────────────────────────────────
const missing = [];
if (!MONGO_URI)            missing.push('MONGO_URI');
if (!SUPERADMIN_EMAIL)     missing.push('SUPERADMIN_EMAIL');
if (!SUPERADMIN_PASSWORD)  missing.push('SUPERADMIN_PASSWORD');
if (!SUPERADMIN_NAME)      missing.push('SUPERADMIN_NAME');

if (missing.length) {
  console.error(`\n❌ Missing required environment variables:\n   ${missing.join(', ')}\n`);
  console.error('   Add them to your .env file and try again.\n');
  process.exit(1);
}

// Password strength check — mirrors the API validation rules
const validatePassword = (pwd) => {
  const errors = [];
  if (pwd.length < 8)        errors.push('at least 8 characters');
  if (!/[A-Z]/.test(pwd))    errors.push('one uppercase letter');
  if (!/[0-9]/.test(pwd))    errors.push('one number');
  if (!/[^A-Za-z0-9]/.test(pwd)) errors.push('one special character');
  return errors;
};

const pwdErrors = validatePassword(SUPERADMIN_PASSWORD);
if (pwdErrors.length) {
  console.error(`\n❌ SUPERADMIN_PASSWORD is too weak. It must contain:\n   - ${pwdErrors.join('\n   - ')}\n`);
  process.exit(1);
}

// ── Seed ──────────────────────────────────────────────────────────────────────
const seed = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB connected');

  const existing = await User.findOne({ email: SUPERADMIN_EMAIL.toLowerCase() });

  if (existing) {
    if (existing.roles.includes('superadmin')) {
      console.log(`\nℹ️  Superadmin already exists: ${existing.email}`);
      console.log('   No changes made.\n');
    } else {
      // Promote existing account to superadmin
      existing.roles = ['superadmin'];
      await existing.save();
      console.log(`\n✅ Existing account promoted to superadmin: ${existing.email}\n`);
    }
    await mongoose.disconnect();
    return;
  }

  // Create fresh superadmin
  const superadmin = await User.create({
    email:      SUPERADMIN_EMAIL.toLowerCase().trim(),
    password:   SUPERADMIN_PASSWORD,   // pre-save hook hashes it
    name:       SUPERADMIN_NAME.trim(),
    roles:      ['superadmin'],
    isVerified: true,
  });

  console.log('\n🎉 Superadmin created successfully!');
  console.log('─────────────────────────────────────');
  console.log(`   ID    : ${superadmin._id}`);
  console.log(`   Name  : ${superadmin.name}`);
  console.log(`   Email : ${superadmin.email}`);
  console.log(`   Roles : ${superadmin.roles.join(', ')}`);
  console.log('─────────────────────────────────────');
  console.log('\n   Sign in via the app using these credentials.\n');

  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  mongoose.disconnect();
  process.exit(1);
});
