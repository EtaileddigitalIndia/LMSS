const express = require('express');
const router = express.Router();
const { authenticateToken, requireInstructor } = require('../middleware/auth');
const { Quiz, QuizAttempt } = require('../models/Quiz_Enhanced');
const Lesson = require('../models/Lesson');

// GET all quizzes by lesson ID
router.get('/lesson/:lessonId', async (req, res) => {
  try {
    const quiz = await Quiz.findOne({
      lesson_id: req.params.lessonId,
      is_active: true
    }).select('-__v');

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found for this lesson'
      });
    }

    res.json({ success: true, data: quiz });
  } catch (error) {
    console.error('Error fetching quiz:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET quiz by ID with user attempt history (for students)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const quizData = await Quiz.findWithUserAttempts(req.params.id, req.user._id);
    
    if (!quizData) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    // Don't expose correct answers until after attempt (unless configured to show)
    let quizToSend = quizData.quiz.toObject();
    if (!quizData.quiz.show_correct_answers || quizData.canRetake) {
      quizToSend.questions = quizToSend.questions.map(q => ({
        ...q,
        correct_answer: undefined,
        explanation: quizData.quiz.immediate_feedback ? q.explanation : undefined
      }));
    }

    res.json({ 
      success: true, 
      data: {
        quiz: quizToSend,
        userStats: {
          attemptCount: quizData.attemptCount,
          canRetake: quizData.canRetake,
          bestScore: quizData.bestScore,
          lastAttempt: quizData.lastAttempt
        }
      }
    });
  } catch (error) {
    console.error('Error fetching quiz by ID:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET quiz for taking (with shuffled questions/options if configured)
router.get('/:id/start', authenticateToken, async (req, res) => {
  try {
    const quizData = await Quiz.findWithUserAttempts(req.params.id, req.user._id);
    
    if (!quizData) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    if (!quizData.canRetake) {
      return res.status(400).json({ 
        success: false, 
        message: `Maximum attempts (${quizData.quiz.max_attempts}) reached` 
      });
    }

    // Prepare quiz for taking
    let questions = quizData.quiz.shuffle_questions 
      ? quizData.quiz.getShuffledQuestions()
      : quizData.quiz.questions;

    // Remove correct answers and explanations for the attempt
    questions = questions.map((question, index) => {
      const options = quizData.quiz.randomize_options 
        ? quizData.quiz.getShuffledOptions(index)
        : question.options;

      return {
        _id: question._id,
        question_text: question.question_text,
        options: options,
        type: question.type,
        points: question.points
      };
    });

    res.json({ 
      success: true, 
      data: {
        quiz: {
          _id: quizData.quiz._id,
          title: quizData.quiz.title,
          description: quizData.quiz.description,
          time_limit: quizData.quiz.time_limit,
          instructions: quizData.quiz.instructions,
          show_progress: quizData.quiz.show_progress,
          allow_skip_questions: quizData.quiz.allow_skip_questions,
          require_all_questions: quizData.quiz.require_all_questions,
          questions: questions
        },
        attemptNumber: quizData.attemptCount + 1,
        timeLimit: quizData.quiz.time_limit * 60 // Convert to seconds
      }
    });
  } catch (error) {
    console.error('Error starting quiz:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST submit quiz attempt
router.post('/:id/submit', authenticateToken, async (req, res) => {
  try {
    const { answers, time_started, time_completed } = req.body;
    
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    // Check if user can still take the quiz
    const existingAttempts = await QuizAttempt.countDocuments({
      quiz_id: req.params.id,
      user_id: req.user._id
    });

    if (existingAttempts >= quiz.max_attempts) {
      return res.status(400).json({ 
        success: false, 
        message: 'Maximum attempts reached' 
      });
    }

    // Calculate score
    const scoreResult = quiz.calculateScore(answers);
    
    // Calculate time taken
    const timeStarted = new Date(time_started);
    const timeCompleted = new Date(time_completed);
    const timeTaken = Math.round((timeCompleted - timeStarted) / 1000); // in seconds

    // Determine status
    let status = 'completed';
    if (timeTaken > quiz.time_limit * 60) {
      status = 'timeout';
    }

    // Create quiz attempt record
    const attempt = new QuizAttempt({
      user_id: req.user._id,
      quiz_id: req.params.id,
      attempt_number: existingAttempts + 1,
      answers: scoreResult.detailedResults,
      score: scoreResult.score,
      max_score: scoreResult.maxScore,
      percentage: scoreResult.percentage,
      passed: scoreResult.passed,
      time_started: timeStarted,
      time_completed: timeCompleted,
      time_taken: timeTaken,
      status: status
    });

    await attempt.save();

    // Update quiz statistics
    await quiz.updateStatistics();

    // Prepare response based on quiz settings
    let responseData = {
      attempt_id: attempt._id,
      score: scoreResult.score,
      max_score: scoreResult.maxScore,
      percentage: scoreResult.percentage,
      passed: scoreResult.passed,
      time_taken: timeTaken,
      attempt_number: attempt.attempt_number,
      can_retake: existingAttempts + 1 < quiz.max_attempts
    };

    if (quiz.show_results) {
      responseData.show_results = true;
      
      if (quiz.show_correct_answers) {
        responseData.detailed_results = scoreResult.detailedResults;
      }
    }

    res.json({ 
      success: true, 
      data: responseData
    });

  } catch (error) {
    console.error('Error submitting quiz:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET quiz attempt details
router.get('/attempt/:attemptId', authenticateToken, async (req, res) => {
  try {
    const attempt = await QuizAttempt.findById(req.params.attemptId)
      .populate('quiz_id', 'title show_correct_answers allow_review')
      .populate('user_id', 'full_name email');

    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Attempt not found' });
    }

    // Check if user owns this attempt or is instructor
    if (attempt.user_id._id.toString() !== req.user._id.toString() && 
        req.user.role !== 'instructor' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.json({ success: true, data: attempt });
  } catch (error) {
    console.error('Error fetching attempt:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET user's quiz attempts history
router.get('/:id/attempts', authenticateToken, async (req, res) => {
  try {
    const attempts = await QuizAttempt.find({
      quiz_id: req.params.id,
      user_id: req.user._id
    }).sort({ attempt_number: -1 });

    res.json({ success: true, data: attempts });
  } catch (error) {
    console.error('Error fetching attempts:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// CREATE quiz (instructor only)
router.post('/', authenticateToken, requireInstructor, async (req, res) => {
  try {
    const {
      title,
      description,
      lesson_id,
      questions,
      passing_score,
      time_limit,
      max_attempts,
      is_active,
      shuffle_questions,
      show_results,
      show_correct_answers,
      allow_review,
      randomize_options,
      show_progress,
      allow_skip_questions,
      require_all_questions,
      auto_submit,
      immediate_feedback,
      certificate_eligible,
      difficulty_level,
      instructions
    } = req.body;

    const lesson = await Lesson.findById(lesson_id).populate('course_id');
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Lesson not found' });
    }

    if (
      lesson.course_id.created_by.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create quiz for this lesson'
      });
    }

    const quiz = new Quiz({
      title,
      description,
      lesson_id,
      questions,
      passing_score,
      time_limit,
      max_attempts,
      is_active,
      shuffle_questions,
      show_results,
      show_correct_answers,
      allow_review,
      randomize_options,
      show_progress,
      allow_skip_questions,
      require_all_questions,
      auto_submit,
      immediate_feedback,
      certificate_eligible,
      difficulty_level,
      instructions
    });

    await quiz.save();

    // Link the quiz to the lesson
    lesson.quiz = quiz._id;
    await lesson.save();

    res.status(201).json({ success: true, data: quiz });
  } catch (error) {
    console.error('Error creating quiz:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// UPDATE quiz (instructor only)
router.put('/:id', authenticateToken, requireInstructor, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate('lesson_id');
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    const lesson = await Lesson.findById(quiz.lesson_id._id).populate('course_id');
    if (
      lesson.course_id.created_by.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this quiz'
      });
    }

    const updatedQuiz = await Quiz.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.json({ success: true, data: updatedQuiz });
  } catch (error) {
    console.error('Error updating quiz:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE quiz (instructor only)
router.delete('/:id', authenticateToken, requireInstructor, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate('lesson_id');
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    const lesson = await Lesson.findById(quiz.lesson_id._id).populate('course_id');
    if (
      lesson.course_id.created_by.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this quiz'
      });
    }

    // Delete all associated attempts
    await QuizAttempt.deleteMany({ quiz_id: quiz._id });

    // Unlink from lesson
    lesson.quiz = null;
    await lesson.save();

    await Quiz.findByIdAndDelete(quiz._id);

    res.json({ success: true, message: 'Quiz deleted successfully' });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET quiz analytics (instructor only)
router.get('/:id/analytics', authenticateToken, requireInstructor, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate('lesson_id');
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    const lesson = await Lesson.findById(quiz.lesson_id._id).populate('course_id');
    if (
      lesson.course_id.created_by.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view analytics'
      });
    }

    // Get detailed analytics
    const attempts = await QuizAttempt.find({ quiz_id: req.params.id })
      .populate('user_id', 'full_name email')
      .sort({ createdAt: -1 });

    const analytics = {
      quiz_info: {
        title: quiz.title,
        total_questions: quiz.questions.length,
        total_points: quiz.totalPoints,
        passing_score: quiz.passing_score,
        time_limit: quiz.time_limit
      },
      summary: {
        total_attempts: quiz.total_attempts,
        unique_users: new Set(attempts.map(a => a.user_id._id.toString())).size,
        pass_rate: quiz.pass_rate,
        average_score: quiz.average_score,
        average_time: Math.round(quiz.average_time / 60), // Convert to minutes
      },
      question_analytics: quiz.questions.map((question, index) => {
        const questionAttempts = attempts.flatMap(attempt => 
          attempt.answers.filter(answer => answer.question_index === index)
        );
        
        const correctCount = questionAttempts.filter(a => a.is_correct).length;
        const totalCount = questionAttempts.length;
        
        return {
          question_number: index + 1,
          question_text: question.question_text.substring(0, 100) + '...',
          correct_percentage: totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0,
          total_attempts: totalCount
        };
      }),
      recent_attempts: attempts.slice(0, 10) // Last 10 attempts
    };

    res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET all quiz attempts for a specific quiz (instructor only)
router.get('/:id/all-attempts', authenticateToken, requireInstructor, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate('lesson_id');
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    const lesson = await Lesson.findById(quiz.lesson_id._id).populate('course_id');
    if (
      lesson.course_id.created_by.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view attempts'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const attempts = await QuizAttempt.find({ quiz_id: req.params.id })
      .populate('user_id', 'full_name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await QuizAttempt.countDocuments({ quiz_id: req.params.id });

    res.json({ 
      success: true, 
      data: {
        attempts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching all attempts:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;