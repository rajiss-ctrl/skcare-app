// models/Users.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const refreshTokenSchema = new mongoose.Schema({
  token:     { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: '7d' }, // auto-purge via TTL index
});

const userSchema = new mongoose.Schema(
  {
    email: {
      type:     String,
      required: true,
      unique:   true,
      lowercase: true,
      trim:     true,
    },
    // password is optional — undefined for guest accounts
    password: {
      type:   String,
      select: false, // never returned in queries unless explicitly requested
    },
    name: {
      type: String,
      trim: true,
    },
    photoURL: {
      type: String,
    },
    roles: {
      type:    [String],
      default: ['user'],
      enum:    ['user', 'staff', 'admin', 'superadmin'],
    },
    isGuest: {
      type:    Boolean,
      default: false,
    },
    // For guest sessions we track a short-lived token so the
    // frontend can resume the same guest cart before converting.
    guestToken: {
      type:   String,
      select: false,
    },
    isVerified: {
      type:    Boolean,
      default: false,
    },
    refreshTokens: {
      type:   [refreshTokenSchema],
      select: false, // kept off the wire by default
    },
    lastLogin: {
      type: Date,
    },
  },
  { timestamps: true }
);

// ─── Indexes ────────────────────────────────────────────────────────────────
// email index is already created by `unique: true` on the field — no duplicate needed

// ─── Hooks ──────────────────────────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  // Only hash when the password field has actually changed
  if (!this.isModified('password') || !this.password) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// ─── Instance methods ────────────────────────────────────────────────────────
/**
 * Compare a plaintext candidate against the stored hash.
 * Must be called on a document retrieved with `.select('+password')`.
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Return a safe user object (strips server-only fields).
 */
userSchema.methods.toPublicJSON = function () {
  // Compute the effective top-level role for convenient frontend checks
  const HIERARCHY   = ['user', 'staff', 'admin', 'superadmin'];
  const topRole     = this.roles.reduce((best, r) => {
    return HIERARCHY.indexOf(r) > HIERARCHY.indexOf(best) ? r : best;
  }, 'user');

  return {
    id:         this._id,
    email:      this.email,
    name:       this.name,
    photoURL:   this.photoURL,
    roles:      this.roles,
    topRole,              // highest single role — use for frontend routing decisions
    isGuest:    this.isGuest,
    isVerified: this.isVerified,
    createdAt:  this.createdAt,
    lastLogin:  this.lastLogin,
  };
};

module.exports = mongoose.model('User', userSchema);
