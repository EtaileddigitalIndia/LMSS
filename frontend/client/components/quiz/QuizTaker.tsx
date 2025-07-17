import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Clock, AlertCircle, CheckCircle, XCircle, BarChart3, Award } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import axios from 'axios';

interface Question {
  _id: string;
  question_text: string;
  options: string[];
  type: 'mcq' | 'true_false' | 'multiple_select';
  points: number;
  index: number;
}

interface QuizData {
  _id: string;
  title: string;
  description: string;
  time_limit?: number;
  questions: Question[];
  totalPoints: number;
}

interface QuizAttemptData {
  attempt_id: string;
  quiz: QuizData;
  attempt_number: number;
  max_attempts: number;
}

interface QuizResult {
  attempt_id: string;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  feedback?: {
    score: number;
    maxScore: number;
    percentage: number;
    passed: boolean;
    questions: Array<{
      question_text: string;
      options: string[];
      correct_answer: number | number[];
      user_answer: any;
      is_correct: boolean;
      explanation?: string;
      points: number;
      points_earned: number;
    }>;
  };
}

interface QuizTakerProps {
  lessonId: string;
  onComplete?: (result: QuizResult) => void;
  onClose?: () => void;
}

const QuizTaker: React.FC<QuizTakerProps> = ({ lessonId, onComplete, onClose }) => {
  const [quizData, setQuizData] = useState<QuizAttemptData | null>(null);
  const [answers, setAnswers] = useState<{[key: number]: any}>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string>("");
  const [startTime, setStartTime] = useState<number>(0);
  
  const token = localStorage.getItem('token');

  // Start quiz
  const startQuiz = async () => {
    try {
      // First, get the quiz by lesson ID
      const quizRes = await axios.get(`http://localhost:3001/api/quizzes/lesson/${lessonId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!quizRes.data.success) {
        setError("Quiz not found for this lesson");
        return;
      }

      const quiz = quizRes.data.data;

      // Start the quiz attempt
      const startRes = await axios.post('http://localhost:3001/api/quiz-attempts/start', {
        quiz_id: quiz._id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (startRes.data.success) {
        setQuizData(startRes.data.data);
        setQuizStarted(true);
        setStartTime(Date.now());
        
        // Initialize time remaining if there's a time limit
        if (startRes.data.data.quiz.time_limit) {
          setTimeRemaining(startRes.data.data.quiz.time_limit * 60); // Convert to seconds
        }
      }
    } catch (err: any) {
      console.error('Error starting quiz:', err);
      setError(err?.response?.data?.message || 'Error starting quiz');
    }
  };

  // Timer effect
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0 || quizCompleted) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          // Auto-submit when time runs out
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, quizCompleted]);

  // Format time for display
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Handle answer change
  const handleAnswerChange = (questionIndex: number, answer: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  };

  // Handle multiple select change
  const handleMultipleSelectChange = (questionIndex: number, optionIndex: number, checked: boolean) => {
    setAnswers(prev => {
      const currentAnswers = prev[questionIndex] || [];
      let newAnswers;
      
      if (checked) {
        newAnswers = [...currentAnswers, optionIndex];
      } else {
        newAnswers = currentAnswers.filter((idx: number) => idx !== optionIndex);
      }
      
      return {
        ...prev,
        [questionIndex]: newAnswers
      };
    });
  };

  // Submit quiz
  const handleSubmitQuiz = async () => {
    if (!quizData) return;

    setIsSubmitting(true);
    
    try {
      const timeTaken = Math.floor((Date.now() - startTime) / 1000);
      
      const submitRes = await axios.post('http://localhost:3001/api/quiz-attempts/submit', {
        attempt_id: quizData.attempt_id,
        answers: answers,
        time_taken: timeTaken
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (submitRes.data.success) {
        setResult(submitRes.data.data);
        setQuizCompleted(true);
        onComplete?.(submitRes.data.data);
      }
    } catch (err: any) {
      console.error('Error submitting quiz:', err);
      setError(err?.response?.data?.message || 'Error submitting quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate progress
  const progress = quizData ? (Object.keys(answers).length / quizData.quiz.questions.length) * 100 : 0;

  // Show error state
  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        {onClose && (
          <Button onClick={onClose} className="mt-4">
            Close
          </Button>
        )}
      </div>
    );
  }

  // Show quiz start screen
  if (!quizStarted && !quizData) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Start Quiz
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>You are about to start the quiz for this lesson. Click the button below to begin.</p>
            <div className="flex gap-4">
              <Button onClick={startQuiz} className="flex-1">
                Start Quiz
              </Button>
              {onClose && (
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show quiz completed screen
  if (quizCompleted && result) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.passed ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              Quiz Completed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{result.score}</p>
                <p className="text-sm text-muted-foreground">Score</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{result.maxScore}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{result.percentage}%</p>
                <p className="text-sm text-muted-foreground">Percentage</p>
              </div>
              <div className="text-center">
                <Badge variant={result.passed ? "default" : "destructive"} className="text-lg px-3 py-1">
                  {result.passed ? "PASSED" : "FAILED"}
                </Badge>
              </div>
            </div>
            
            {onClose && (
              <Button onClick={onClose} className="w-full">
                Continue Learning
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Detailed Feedback */}
        {result.feedback && (
          <Card>
            <CardHeader>
              <CardTitle>Detailed Feedback</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {result.feedback.questions.map((q, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <h4 className="font-medium">{index + 1}. {q.question_text}</h4>
                    <div className="flex items-center gap-2">
                      {q.is_correct ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <Badge variant="secondary">
                        {q.points_earned}/{q.points} pts
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    {q.options.map((option, optIndex) => {
                      const isCorrect = Array.isArray(q.correct_answer) 
                        ? q.correct_answer.includes(optIndex)
                        : q.correct_answer === optIndex;
                      const isSelected = Array.isArray(q.user_answer)
                        ? q.user_answer.includes(optIndex)
                        : q.user_answer === optIndex;
                      
                      return (
                        <div
                          key={optIndex}
                          className={`p-2 rounded ${
                            isCorrect ? 'bg-green-100 border border-green-300' :
                            isSelected && !isCorrect ? 'bg-red-100 border border-red-300' :
                            'bg-gray-50 border border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isSelected && (
                              <span className="text-blue-600">→</span>
                            )}
                            <span>{option}</span>
                            {isCorrect && (
                              <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {q.explanation && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-3">
                      <p className="text-sm"><strong>Explanation:</strong> {q.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Show quiz taking interface
  if (!quizData) return <div>Loading...</div>;

  const currentQ = quizData.quiz.questions[currentQuestion];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{quizData.quiz.title}</CardTitle>
            <div className="flex items-center gap-4">
              {timeRemaining !== null && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className={`font-mono ${timeRemaining < 300 ? 'text-red-600' : ''}`}>
                    {formatTime(timeRemaining)}
                  </span>
                </div>
              )}
              <Badge variant="outline">
                Attempt {quizData.attempt_number}/{quizData.max_attempts}
              </Badge>
            </div>
          </div>
          {quizData.quiz.description && (
            <p className="text-muted-foreground">{quizData.quiz.description}</p>
          )}
        </CardHeader>
      </Card>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{Object.keys(answers).length}/{quizData.quiz.questions.length} answered</span>
            </div>
            <Progress value={progress} />
          </div>
        </CardContent>
      </Card>

      {/* Question Navigation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            {quizData.quiz.questions.map((_, index) => (
              <Button
                key={index}
                variant={index === currentQuestion ? "default" : answers[index] !== undefined ? "secondary" : "outline"}
                size="sm"
                onClick={() => setCurrentQuestion(index)}
                className={`w-10 h-10 ${answers[index] !== undefined ? 'bg-green-100 border-green-300' : ''}`}
              >
                {index + 1}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Question */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Question {currentQuestion + 1} of {quizData.quiz.questions.length}
            </CardTitle>
            <Badge variant="secondary">{currentQ.points} point{currentQ.points !== 1 ? 's' : ''}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-lg">{currentQ.question_text}</p>
          
          <div className="space-y-3">
            {currentQ.type === 'mcq' && (
              <RadioGroup
                value={answers[currentQuestion]?.toString() || ""}
                onValueChange={(value) => handleAnswerChange(currentQuestion, parseInt(value))}
              >
                {currentQ.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <RadioGroupItem value={index.toString()} id={`q${currentQuestion}-opt${index}`} />
                    <Label htmlFor={`q${currentQuestion}-opt${index}`} className="flex-1 cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {currentQ.type === 'true_false' && (
              <RadioGroup
                value={answers[currentQuestion]?.toString() || ""}
                onValueChange={(value) => handleAnswerChange(currentQuestion, parseInt(value))}
              >
                {currentQ.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <RadioGroupItem value={index.toString()} id={`q${currentQuestion}-opt${index}`} />
                    <Label htmlFor={`q${currentQuestion}-opt${index}`} className="flex-1 cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {currentQ.type === 'multiple_select' && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Select all that apply:</p>
                {currentQ.options.map((option, index) => {
                  const selectedAnswers = answers[currentQuestion] || [];
                  return (
                    <div key={index} className="flex items-center space-x-2">
                      <Checkbox
                        id={`q${currentQuestion}-opt${index}`}
                        checked={selectedAnswers.includes(index)}
                        onCheckedChange={(checked) => 
                          handleMultipleSelectChange(currentQuestion, index, checked as boolean)
                        }
                      />
                      <Label htmlFor={`q${currentQuestion}-opt${index}`} className="flex-1 cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Navigation and Submit */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
              disabled={currentQuestion === 0}
            >
              Previous
            </Button>
            
            <div className="flex gap-2">
              {currentQuestion < quizData.quiz.questions.length - 1 ? (
                <Button
                  onClick={() => setCurrentQuestion(currentQuestion + 1)}
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleSubmitQuiz}
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuizTaker;