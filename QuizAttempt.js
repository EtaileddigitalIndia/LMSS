const mongoose = require('mongoose');

// Quiz Attempt Schema for tracking individual attempts
const quizAttemptSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  quiz_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  attempt_number: {
    type: Number,
    required: true,
    min: 1
  },
  answers: [{
    question_index: Number,
    selected_answer: mongoose.Schema.Types.Mixed, // Can be number or array
    is_correct: Boolean,
    points_earned: Number,
    time_spent: Number // seconds spent on this question
  }],
  score: {
    type: Number,
    required: true,
    min: 0
  },
  max_score: {
    type: Number,
    required: true,
    min: 0
  },
  percentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  passed: {
    type: Boolean,
    required: true
  },
  time_started: {
    type: Date,
    required: true
  },
  time_completed: {
    type: Date,
    required: true
  },
  time_taken: {
    type: Number, // Total time in seconds
    required: true
  },
  status: {
    type: String,
    enum: ['completed', 'timeout', 'abandoned'],
    default: 'completed'
  },
  feedback_provided: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for better query performance
quizAttemptSchema.index({ user_id: 1, quiz_id: 1 });
quizAttemptSchema.index({ quiz_id: 1, attempt_number: 1 });
quizAttemptSchema.index({ user_id: 1 });
quizAttemptSchema.index({ createdAt: -1 });

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);