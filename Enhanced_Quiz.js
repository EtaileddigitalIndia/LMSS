const mongoose = require('mongoose');

const quizQuestionSchema = new mongoose.Schema({
  question_text: {
    type: String,
    required: true,
    trim: true
  },
  options: [{
    type: String,
    required: true,
    trim: true
  }],
  correct_answer: {
    type: mongoose.Schema.Types.Mixed, // Can be Number for single choice or Array for multiple choice
    required: true
  },
  type: {
    type: String,
    enum: ['mcq', 'true_false', 'multiple_select'],
    default: 'mcq'
  },
  points: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  explanation: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

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

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255
  },
  description: {
    type: String,
    trim: true
  },
  lesson_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson',
    required: true
  },
  questions: [quizQuestionSchema],
  passing_score: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 70
  },
  time_limit: {
    type: Number, // in minutes
    min: 1,
    default: 30
  },
  max_attempts: {
    type: Number,
    min: 1,
    default: 3
  },
  is_active: {
    type: Boolean,
    default: true
  },
  shuffle_questions: {
    type: Boolean,
    default: false
  },
  show_results: {
    type: Boolean,
    default: true
  },
  show_correct_answers: {
    type: Boolean,
    default: true
  },
  allow_review: {
    type: Boolean,
    default: true
  },
  randomize_options: {
    type: Boolean,
    default: false
  },
  // Enhanced features
  show_progress: {
    type: Boolean,
    default: true
  },
  allow_skip_questions: {
    type: Boolean,
    default: false
  },
  require_all_questions: {
    type: Boolean,
    default: true
  },
  auto_submit: {
    type: Boolean,
    default: true
  },
  immediate_feedback: {
    type: Boolean,
    default: false
  },
  certificate_eligible: {
    type: Boolean,
    default: false
  },
  difficulty_level: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  instructions: {
    type: String,
    trim: true
  },
  // Statistics
  total_attempts: {
    type: Number,
    default: 0
  },
  pass_rate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  average_score: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  average_time: {
    type: Number,
    default: 0 // in seconds
  }
}, {
  timestamps: true
});

// Indexes for better query performance
quizSchema.index({ lesson_id: 1 });
quizSchema.index({ is_active: 1 });
quizSchema.index({ difficulty_level: 1 });
quizAttemptSchema.index({ user_id: 1, quiz_id: 1 });
quizAttemptSchema.index({ quiz_id: 1, attempt_number: 1 });

// Virtual for total points
quizSchema.virtual('totalPoints').get(function() {
  return this.questions.reduce((total, question) => total + question.points, 0);
});

// Virtual for question count
quizSchema.virtual('questionCount').get(function() {
  return this.questions.length;
});

// Virtual for estimated time
quizSchema.virtual('estimatedTime').get(function() {
  return Math.ceil(this.questions.length * 1.5); // 1.5 minutes per question estimate
});

// Method to calculate score for an attempt
quizSchema.methods.calculateScore = function(answers) {
  let totalScore = 0;
  let maxScore = 0;
  const detailedResults = [];

  this.questions.forEach((question, index) => {
    maxScore += question.points;
    let isCorrect = false;
    let pointsEarned = 0;

    if (answers[index] !== undefined && answers[index] !== null) {
      if (question.type === 'multiple_select') {
        // For multiple select, check if all correct answers are selected
        const correctAnswers = Array.isArray(question.correct_answer) 
          ? question.correct_answer 
          : [question.correct_answer];
        const selectedAnswers = Array.isArray(answers[index]) 
          ? answers[index] 
          : [answers[index]];
        
        if (selectedAnswers.length === correctAnswers.length &&
            selectedAnswers.every(answer => correctAnswers.includes(answer))) {
          isCorrect = true;
          pointsEarned = question.points;
          totalScore += question.points;
        }
      } else {
        // For single choice questions (MCQ, True/False)
        if (answers[index] === question.correct_answer) {
          isCorrect = true;
          pointsEarned = question.points;
          totalScore += question.points;
        }
      }
    }

    detailedResults.push({
      question_index: index,
      selected_answer: answers[index],
      is_correct: isCorrect,
      points_earned: pointsEarned,
      correct_answer: question.correct_answer,
      explanation: question.explanation
    });
  });

  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  return {
    score: totalScore,
    maxScore: maxScore,
    percentage: percentage,
    detailedResults: detailedResults,
    passed: percentage >= this.passing_score
  };
};

// Method to check if user passed
quizSchema.methods.checkPassed = function(score, maxScore) {
  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
  return percentage >= this.passing_score;
};

// Method to shuffle questions
quizSchema.methods.getShuffledQuestions = function() {
  if (!this.shuffle_questions) return this.questions;
  
  const shuffled = [...this.questions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Method to shuffle options for a question
quizSchema.methods.getShuffledOptions = function(questionIndex) {
  const question = this.questions[questionIndex];
  if (!this.randomize_options || question.type === 'true_false') {
    return question.options;
  }

  const shuffled = [...question.options];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Method to update quiz statistics
quizSchema.methods.updateStatistics = async function() {
  const QuizAttempt = mongoose.model('QuizAttempt');
  
  const stats = await QuizAttempt.aggregate([
    { $match: { quiz_id: this._id } },
    {
      $group: {
        _id: null,
        totalAttempts: { $sum: 1 },
        passedAttempts: { $sum: { $cond: ["$passed", 1, 0] } },
        averageScore: { $avg: "$percentage" },
        averageTime: { $avg: "$time_taken" }
      }
    }
  ]);

  if (stats.length > 0) {
    const stat = stats[0];
    this.total_attempts = stat.totalAttempts;
    this.pass_rate = stat.totalAttempts > 0 
      ? Math.round((stat.passedAttempts / stat.totalAttempts) * 100) 
      : 0;
    this.average_score = Math.round(stat.averageScore || 0);
    this.average_time = Math.round(stat.averageTime || 0);
  }

  return this.save();
};

// Static method to find active quizzes
quizSchema.statics.findActive = function() {
  return this.find({ is_active: true });
};

// Static method to find quizzes by lesson
quizSchema.statics.findByLesson = function(lessonId) {
  return this.findOne({ lesson_id: lessonId, is_active: true });
};

// Static method to get quiz with user's attempt history
quizSchema.statics.findWithUserAttempts = async function(quizId, userId) {
  const quiz = await this.findById(quizId);
  if (!quiz) return null;

  const QuizAttempt = mongoose.model('QuizAttempt');
  const attempts = await QuizAttempt.find({ 
    quiz_id: quizId, 
    user_id: userId 
  }).sort({ attempt_number: -1 });

  return {
    quiz: quiz,
    attempts: attempts,
    attemptCount: attempts.length,
    lastAttempt: attempts[0] || null,
    canRetake: attempts.length < quiz.max_attempts,
    bestScore: attempts.length > 0 
      ? Math.max(...attempts.map(a => a.percentage)) 
      : 0
  };
};

// Quiz Attempt Model
const QuizAttempt = mongoose.model('QuizAttempt', quizAttemptSchema);

module.exports = mongoose.model('Quiz', quizSchema);