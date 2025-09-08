const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email']
  },
  full_name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
    minlength: 2
  },
  role: {
    type: String,
    enum: ['admin', 'instructor', 'student', 'guest', 'parent', 'reseller', 'ta'],
    default: 'student'
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false // Don't include password in queries by default
  },
  avatar_url: {
    type: String,
    default: null
  },
  is_active: {
    type: Boolean,
    default: true
  },
  profile: {
    bio: String,
    phone: String,
    address: String,
    date_of_birth: Date,
    education: String,
    experience: String,
    skills: [String],
    social_links: {
      linkedin: String,
      twitter: String,
      github: String,
      website: String
    }
  },
  reset_password_token: String,
  reset_password_expires: Date,
  email_verified: {
    type: Boolean,
    default: false
  },
  last_login: Date,
  login_attempts: {
    type: Number,
    default: 0
  },
  locked_until: Date
}, {
  timestamps: true
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ is_active: 1 });
userSchema.index({ email_verified: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    // Validate password strength before hashing
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(this.password)) {
      return next(new Error('Password must contain at least one uppercase letter, one lowercase letter, and one number'));
    }
    
    const salt = await bcrypt.genSalt(12); // Increased salt rounds for better security
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
};

// Account lockout methods
userSchema.methods.incrementLoginAttempts = async function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.locked_until && this.locked_until < Date.now()) {
    return this.updateOne({
      $unset: { locked_until: 1 },
      $set: { login_attempts: 1 }
    });
  }
  
  const updates = { $inc: { login_attempts: 1 } };
  
  // If we have hit max attempts and it's not locked yet, lock it
  if (this.login_attempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { locked_until: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = async function() {
  return this.updateOne({
    $unset: { login_attempts: 1, locked_until: 1 }
  });
};

userSchema.virtual('isLocked').get(function() {
  return !!(this.locked_until && this.locked_until > Date.now());
});

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.reset_password_token;
  delete user.reset_password_expires;
  delete user.login_attempts;
  delete user.locked_until;
  return user;
};

// Virtual for user's full name
userSchema.virtual('displayName').get(function() {
  return this.full_name;
});

// Static method to find by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find active users
userSchema.statics.findActive = function() {
  return this.find({ is_active: true });
};

// Static method to find by email with password (for authentication)
userSchema.statics.findByEmailWithPassword = function(email) {
  return this.findOne({ email: email.toLowerCase() }).select('+password +login_attempts +locked_until');
};

module.exports = mongoose.model('User', userSchema); 