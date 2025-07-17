const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const Lesson = require('../models/Lesson');

// Start a quiz attempt
router.post('/start', authenticateToken, async (req, res) => {
  try {
    const { quiz_id } = req.body;
    const userId = req.user._id;

    const quiz = await Quiz.findById(quiz_id).populate('lesson_id');
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    if (!quiz.is_active) {
      return res.status(400).json({ success: false, message: 'Quiz is not active' });
    }

    // Check existing attempts
    const existingAttempts = await QuizAttempt.find({ 
      user_id: userId, 
      quiz_id: quiz_id 
    }).sort({ attempt_number: -1 });

    if (existingAttempts.length >= quiz.max_attempts) {
      return res.status(400).json({ 
        success: false, 
        message: 'Maximum attempts reached' 
      });
    }

    const attemptNumber = existingAttempts.length + 1;

    // Create quiz attempt record
    const quizAttempt = new QuizAttempt({
      user_id: userId,
      quiz_id: quiz_id,
      attempt_number: attemptNumber,
      answers: [],
      score: 0,
      max_score: quiz.totalPoints,
      percentage: 0,
      passed: false,
      time_started: new Date(),
      time_completed: new Date(),
      time_taken: 0,
      status: 'in_progress'
    });

    await quizAttempt.save();

    // Return quiz questions (shuffle if needed)
    let questions = [...quiz.questions];
    if (quiz.shuffle_questions) {
      questions = questions.sort(() => Math.random() - 0.5);
    }

    // Remove correct answers from questions sent to client
    const clientQuestions = questions.map((q, index) => ({
      _id: q._id,
      question_text: q.question_text,
      options: q.options,
      type: q.type,
      points: q.points,
      index: index
    }));

    res.json({
      success: true,
      data: {
        attempt_id: quizAttempt._id,
        quiz: {
          _id: quiz._id,
          title: quiz.title,
          description: quiz.description,
          time_limit: quiz.time_limit,
          questions: clientQuestions,
          totalPoints: quiz.totalPoints
        },
        attempt_number: attemptNumber,
        max_attempts: quiz.max_attempts
      }
    });
  } catch (error) {
    console.error('Error starting quiz:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Submit quiz attempt
router.post('/submit', authenticateToken, async (req, res) => {
  try {
    const { attempt_id, answers, time_taken } = req.body;
    const userId = req.user._id;

    const attempt = await QuizAttempt.findOne({ 
      _id: attempt_id, 
      user_id: userId 
    }).populate('quiz_id');

    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Quiz attempt not found' });
    }

    const quiz = attempt.quiz_id;

    // Calculate score
    const scoreResult = quiz.calculateScore(answers);
    const passed = quiz.checkPassed(scoreResult.score, scoreResult.maxScore);

    // Process answers with detailed feedback
    const processedAnswers = quiz.questions.map((question, index) => {
      const userAnswer = answers[index];
      let isCorrect = false;
      let pointsEarned = 0;

      if (userAnswer !== undefined) {
        if (question.type === 'multiple_select') {
          const correctAnswers = question.correct_answer;
          isCorrect = Array.isArray(userAnswer) && 
                     userAnswer.length === correctAnswers.length &&
                     userAnswer.every(answer => correctAnswers.includes(answer));
        } else {
          isCorrect = userAnswer === question.correct_answer;
        }
        
        if (isCorrect) {
          pointsEarned = question.points;
        }
      }

      return {
        question_index: index,
        selected_answer: userAnswer,
        is_correct: isCorrect,
        points_earned: pointsEarned,
        time_spent: 0 // Can be enhanced to track per-question time
      };
    });

    // Update attempt
    attempt.answers = processedAnswers;
    attempt.score = scoreResult.score;
    attempt.max_score = scoreResult.maxScore;
    attempt.percentage = scoreResult.percentage;
    attempt.passed = passed;
    attempt.time_completed = new Date();
    attempt.time_taken = time_taken;
    attempt.status = 'completed';

    await attempt.save();

    // Prepare response with feedback if enabled
    let feedback = null;
    if (quiz.show_results) {
      feedback = {
        score: scoreResult.score,
        maxScore: scoreResult.maxScore,
        percentage: scoreResult.percentage,
        passed: passed,
        questions: quiz.questions.map((question, index) => ({
          question_text: question.question_text,
          options: question.options,
          correct_answer: question.correct_answer,
          user_answer: answers[index],
          is_correct: processedAnswers[index].is_correct,
          explanation: question.explanation,
          points: question.points,
          points_earned: processedAnswers[index].points_earned
        }))
      };
    }

    res.json({
      success: true,
      data: {
        attempt_id: attempt._id,
        score: scoreResult.score,
        maxScore: scoreResult.maxScore,
        percentage: scoreResult.percentage,
        passed: passed,
        feedback: feedback
      }
    });
  } catch (error) {
    console.error('Error submitting quiz:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get user's quiz attempts
router.get('/user/:userId/quiz/:quizId', authenticateToken, async (req, res) => {
  try {
    const { userId, quizId } = req.params;
    
    // Users can only view their own attempts, or admin/instructor can view any
    if (req.user._id.toString() !== userId && 
        !['admin', 'instructor'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const attempts = await QuizAttempt.find({ 
      user_id: userId, 
      quiz_id: quizId 
    }).sort({ attempt_number: -1 }).populate('quiz_id', 'title');

    res.json({ success: true, data: attempts });
  } catch (error) {
    console.error('Error fetching attempts:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get quiz attempt details
router.get('/:attemptId', authenticateToken, async (req, res) => {
  try {
    const { attemptId } = req.params;
    
    const attempt = await QuizAttempt.findById(attemptId)
      .populate('quiz_id')
      .populate('user_id', 'name email');

    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Attempt not found' });
    }

    // Users can only view their own attempts, or admin/instructor can view any
    if (attempt.user_id._id.toString() !== req.user._id.toString() && 
        !['admin', 'instructor'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.json({ success: true, data: attempt });
  } catch (error) {
    console.error('Error fetching attempt:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get quiz analytics (for instructors)
router.get('/analytics/quiz/:quizId', authenticateToken, async (req, res) => {
  try {
    const { quizId } = req.params;
    
    if (!['admin', 'instructor'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const quiz = await Quiz.findById(quizId).populate('lesson_id');
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    const attempts = await QuizAttempt.find({ quiz_id: quizId })
      .populate('user_id', 'name email')
      .sort({ createdAt: -1 });

    const analytics = {
      totalAttempts: attempts.length,
      uniqueUsers: new Set(attempts.map(a => a.user_id._id.toString())).size,
      averageScore: attempts.length > 0 ? 
        attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length : 0,
      passRate: attempts.length > 0 ? 
        (attempts.filter(a => a.passed).length / attempts.length) * 100 : 0,
      averageTimeSpent: attempts.length > 0 ? 
        attempts.reduce((sum, a) => sum + a.time_taken, 0) / attempts.length : 0,
      attempts: attempts
    };

    res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;