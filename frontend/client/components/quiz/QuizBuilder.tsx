import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Trash2, Plus, Copy, Clock, Users, Settings, BarChart3 } from 'lucide-react';
import axios from 'axios';

interface Question {
  _id?: string;
  question_text: string;
  options: string[];
  correct_answer: number | number[];
  type: 'mcq' | 'true_false' | 'multiple_select';
  points: number;
  explanation: string;
}

interface Quiz {
  _id?: string;
  title: string;
  description: string;
  lesson_id: string;
  questions: Question[];
  passing_score: number;
  time_limit?: number;
  max_attempts: number;
  is_active: boolean;
  shuffle_questions: boolean;
  show_results: boolean;
}

interface QuizBuilderProps {
  lessonId: string;
  existingQuiz?: Quiz | null;
  onSave: () => void;
  onCancel: () => void;
}

const defaultQuestion: Question = {
  question_text: '',
  options: ['', ''],
  correct_answer: 0,
  type: 'mcq',
  points: 1,
  explanation: ''
};

const QuizBuilder: React.FC<QuizBuilderProps> = ({ lessonId, existingQuiz, onSave, onCancel }) => {
  const [quiz, setQuiz] = useState<Quiz>({
    title: '',
    description: '',
    lesson_id: lessonId,
    questions: [{ ...defaultQuestion }],
    passing_score: 70,
    time_limit: undefined,
    max_attempts: 3,
    is_active: true,
    shuffle_questions: false,
    show_results: true
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'questions' | 'settings'>('questions');
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (existingQuiz) {
      setQuiz(existingQuiz);
    }
  }, [existingQuiz]);

  const updateQuiz = (field: keyof Quiz, value: any) => {
    setQuiz(prev => ({ ...prev, [field]: value }));
  };

  const addQuestion = () => {
    setQuiz(prev => ({
      ...prev,
      questions: [...prev.questions, { ...defaultQuestion }]
    }));
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => 
        i === index ? { ...q, [field]: value } : q
      )
    }));
  };

  const deleteQuestion = (index: number) => {
    if (quiz.questions.length > 1) {
      setQuiz(prev => ({
        ...prev,
        questions: prev.questions.filter((_, i) => i !== index)
      }));
    }
  };

  const duplicateQuestion = (index: number) => {
    const questionToDuplicate = { ...quiz.questions[index] };
    delete questionToDuplicate._id;
    questionToDuplicate.question_text += ' (Copy)';
    
    setQuiz(prev => ({
      ...prev,
      questions: [
        ...prev.questions.slice(0, index + 1),
        questionToDuplicate,
        ...prev.questions.slice(index + 1)
      ]
    }));
  };

  const addOption = (questionIndex: number) => {
    updateQuestion(questionIndex, 'options', [...quiz.questions[questionIndex].options, '']);
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const newOptions = [...quiz.questions[questionIndex].options];
    newOptions[optionIndex] = value;
    updateQuestion(questionIndex, 'options', newOptions);
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const question = quiz.questions[questionIndex];
    if (question.options.length > 2) {
      const newOptions = question.options.filter((_, i) => i !== optionIndex);
      updateQuestion(questionIndex, 'options', newOptions);
      
      // Adjust correct answer if needed
      if (question.type === 'mcq' && question.correct_answer === optionIndex) {
        updateQuestion(questionIndex, 'correct_answer', 0);
      } else if (question.type === 'multiple_select') {
        const correctAnswers = Array.isArray(question.correct_answer) ? question.correct_answer : [];
        const newCorrectAnswers = correctAnswers
          .filter(idx => idx !== optionIndex)
          .map(idx => idx > optionIndex ? idx - 1 : idx);
        updateQuestion(questionIndex, 'correct_answer', newCorrectAnswers);
      }
    }
  };

  const handleQuestionTypeChange = (questionIndex: number, newType: 'mcq' | 'true_false' | 'multiple_select') => {
    const question = quiz.questions[questionIndex];
    
    if (newType === 'true_false') {
      updateQuestion(questionIndex, 'options', ['True', 'False']);
      updateQuestion(questionIndex, 'correct_answer', 0);
    } else if (newType === 'multiple_select') {
      updateQuestion(questionIndex, 'correct_answer', []);
    } else {
      updateQuestion(questionIndex, 'correct_answer', 0);
    }
    
    updateQuestion(questionIndex, 'type', newType);
  };

  const handleMultipleSelectChange = (questionIndex: number, optionIndex: number, checked: boolean) => {
    const question = quiz.questions[questionIndex];
    let correctAnswers = Array.isArray(question.correct_answer) ? [...question.correct_answer] : [];
    
    if (checked) {
      if (!correctAnswers.includes(optionIndex)) {
        correctAnswers.push(optionIndex);
      }
    } else {
      correctAnswers = correctAnswers.filter(idx => idx !== optionIndex);
    }
    
    updateQuestion(questionIndex, 'correct_answer', correctAnswers);
  };

  const saveQuiz = async () => {
    if (!quiz.title.trim()) {
      alert('Please enter a quiz title');
      return;
    }

    if (quiz.questions.length === 0) {
      alert('Please add at least one question');
      return;
    }

    // Validate questions
    for (let i = 0; i < quiz.questions.length; i++) {
      const q = quiz.questions[i];
      if (!q.question_text.trim()) {
        alert(`Please enter text for question ${i + 1}`);
        return;
      }
      
      if (q.options.some(opt => !opt.trim())) {
        alert(`Please fill all options for question ${i + 1}`);
        return;
      }

      if (q.type === 'multiple_select') {
        const correctAnswers = Array.isArray(q.correct_answer) ? q.correct_answer : [];
        if (correctAnswers.length === 0) {
          alert(`Please select at least one correct answer for question ${i + 1}`);
          return;
        }
      }
    }

    setIsSubmitting(true);

    try {
      const url = existingQuiz 
        ? `http://localhost:3001/api/quizzes/${existingQuiz._id}`
        : 'http://localhost:3001/api/quizzes';
      
      const method = existingQuiz ? 'put' : 'post';
      
      await axios[method](url, quiz, {
        headers: { Authorization: `Bearer ${token}` }
      });

      onSave();
    } catch (error: any) {
      console.error('Error saving quiz:', error);
      alert(error?.response?.data?.message || 'Error saving quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {existingQuiz ? 'Edit Quiz' : 'Create New Quiz'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Quiz Title"
            value={quiz.title}
            onChange={(e) => updateQuiz('title', e.target.value)}
            disabled={isSubmitting}
          />
          <Textarea
            placeholder="Quiz Description (optional)"
            value={quiz.description}
            onChange={(e) => updateQuiz('description', e.target.value)}
            disabled={isSubmitting}
          />
          
          {/* Tabs */}
          <div className="flex space-x-1 bg-muted p-1 rounded-lg">
            <Button
              variant={activeTab === 'questions' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('questions')}
              className="flex-1"
            >
              Questions ({quiz.questions.length})
            </Button>
            <Button
              variant={activeTab === 'settings' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('settings')}
              className="flex-1"
            >
              <Settings className="h-4 w-4 mr-1" />
              Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Questions Tab */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          {quiz.questions.map((question, questionIndex) => (
            <Card key={questionIndex}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Question {questionIndex + 1}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{question.points} point{question.points !== 1 ? 's' : ''}</Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => duplicateQuestion(questionIndex)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    {quiz.questions.length > 1 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteQuestion(questionIndex)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Enter your question..."
                  value={question.question_text}
                  onChange={(e) => updateQuestion(questionIndex, 'question_text', e.target.value)}
                  disabled={isSubmitting}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Select
                    value={question.type}
                    onValueChange={(value: 'mcq' | 'true_false' | 'multiple_select') => 
                      handleQuestionTypeChange(questionIndex, value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mcq">Multiple Choice</SelectItem>
                      <SelectItem value="true_false">True/False</SelectItem>
                      <SelectItem value="multiple_select">Multiple Select</SelectItem>
                    </SelectContent>
                  </Select>

                  <Input
                    type="number"
                    min="1"
                    placeholder="Points"
                    value={question.points}
                    onChange={(e) => updateQuestion(questionIndex, 'points', Number(e.target.value))}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Options */}
                <div className="space-y-2">
                  <Label>Options</Label>
                  {question.options.map((option, optionIndex) => (
                    <div key={optionIndex} className="flex items-center gap-2">
                      {question.type === 'mcq' && (
                        <input
                          type="radio"
                          name={`question-${questionIndex}`}
                          checked={question.correct_answer === optionIndex}
                          onChange={() => updateQuestion(questionIndex, 'correct_answer', optionIndex)}
                          className="mt-1"
                        />
                      )}
                      {question.type === 'multiple_select' && (
                        <Checkbox
                          checked={Array.isArray(question.correct_answer) && 
                            question.correct_answer.includes(optionIndex)}
                          onCheckedChange={(checked) => 
                            handleMultipleSelectChange(questionIndex, optionIndex, checked as boolean)
                          }
                        />
                      )}
                      {question.type === 'true_false' && (
                        <input
                          type="radio"
                          name={`question-${questionIndex}`}
                          checked={question.correct_answer === optionIndex}
                          onChange={() => updateQuestion(questionIndex, 'correct_answer', optionIndex)}
                          className="mt-1"
                        />
                      )}
                      
                      <Input
                        placeholder={`Option ${optionIndex + 1}`}
                        value={option}
                        onChange={(e) => updateOption(questionIndex, optionIndex, e.target.value)}
                        disabled={isSubmitting || question.type === 'true_false'}
                        className="flex-1"
                      />
                      
                      {question.type !== 'true_false' && question.options.length > 2 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeOption(questionIndex, optionIndex)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  
                  {question.type !== 'true_false' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addOption(questionIndex)}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Option
                    </Button>
                  )}
                </div>

                <Textarea
                  placeholder="Explanation (optional)"
                  value={question.explanation}
                  onChange={(e) => updateQuestion(questionIndex, 'explanation', e.target.value)}
                  disabled={isSubmitting}
                />
              </CardContent>
            </Card>
          ))}

          <Button onClick={addQuestion} className="w-full" variant="outline">
            <Plus className="h-4 w-4 mr-1" />
            Add Question
          </Button>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <Card>
          <CardHeader>
            <CardTitle>Quiz Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="passing-score">Passing Score (%)</Label>
                  <Input
                    id="passing-score"
                    type="number"
                    min="0"
                    max="100"
                    value={quiz.passing_score}
                    onChange={(e) => updateQuiz('passing_score', Number(e.target.value))}
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <Label htmlFor="time-limit">Time Limit (minutes, optional)</Label>
                  <Input
                    id="time-limit"
                    type="number"
                    min="1"
                    placeholder="No time limit"
                    value={quiz.time_limit || ''}
                    onChange={(e) => updateQuiz('time_limit', e.target.value ? Number(e.target.value) : undefined)}
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <Label htmlFor="max-attempts">Maximum Attempts</Label>
                  <Input
                    id="max-attempts"
                    type="number"
                    min="1"
                    value={quiz.max_attempts}
                    onChange={(e) => updateQuiz('max_attempts', Number(e.target.value))}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="shuffle-questions"
                    checked={quiz.shuffle_questions}
                    onCheckedChange={(checked) => updateQuiz('shuffle_questions', checked)}
                  />
                  <Label htmlFor="shuffle-questions">Shuffle Questions</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-results"
                    checked={quiz.show_results}
                    onCheckedChange={(checked) => updateQuiz('show_results', checked)}
                  />
                  <Label htmlFor="show-results">Show Results to Students</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is-active"
                    checked={quiz.is_active}
                    onCheckedChange={(checked) => updateQuiz('is_active', checked)}
                  />
                  <Label htmlFor="is-active">Quiz Active</Label>
                </div>
              </div>
            </div>

            <Separator />

            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Quiz Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>Total Questions: {quiz.questions.length}</div>
                <div>Total Points: {totalPoints}</div>
                <div>Passing Score: {quiz.passing_score}%</div>
                <div>Max Attempts: {quiz.max_attempts}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          onClick={saveQuiz}
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? 'Saving...' : existingQuiz ? 'Update Quiz' : 'Create Quiz'}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default QuizBuilder;