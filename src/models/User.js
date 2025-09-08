const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  full_name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  role: {
    type: String,
    enum: ['admin', 'instructor', 'student', 'guest', 'parent', 'reseller', 'ta'],
    default: 'student'
  },
  password: {
    type: String,
    required: true,
    minlength: 8
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
  last_login: Date
}, {
  timestamps: true
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ is_active: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.reset_password_token;
  delete user.reset_password_expires;
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

module.exports = mongoose.model('User', userSchema); 