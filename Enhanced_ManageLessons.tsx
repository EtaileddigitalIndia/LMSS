import { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import AppLayout from "@/components/layout/AppLayout";
import { Plus, Trash2, Edit, Clock, Target, Users, HelpCircle } from "lucide-react";

interface Course {
  _id: string;
  title: string;
}

interface Lesson {
  _id: string;
  title: string;
  content: string;
  order: number;
  duration: number;
  attachments?: UploadedFile[];
  quiz?: string; // Quiz ID if attached
}

interface UploadedFile {
  filename: string;
  url: string;
  type: string;
}

interface QuizQuestion {
  question_text: string;
  options: string[];
  correct_answer: number | number[];
  type: 'mcq' | 'true_false' | 'multiple_select';
  points: number;
  explanation: string;
}

interface Quiz {
  _id: string;
  title: string;
  description: string;
  lesson_id: string;
  questions: QuizQuestion[];
  passing_score: number;
  time_limit: number;
  max_attempts: number;
  is_active: boolean;
  shuffle_questions: boolean;
  show_results: boolean;
  show_correct_answers: boolean;
  allow_review: boolean;
  randomize_options: boolean;
}

const ManageLessons = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [newLesson, setNewLesson] = useState({
    title: "",
    content: "",
    order: 1,
    duration: 10,
  });
  const [file, setFile] = useState<File | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quiz Management States
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [selectedLessonForQuiz, setSelectedLessonForQuiz] = useState<string>("");
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [newQuiz, setNewQuiz] = useState<Partial<Quiz>>({
    title: "",
    description: "",
    passing_score: 70,
    time_limit: 30,
    max_attempts: 3,
    is_active: true,
    shuffle_questions: false,
    show_results: true,
    show_correct_answers: true,
    allow_review: true,
    randomize_options: false,
    questions: []
  });

  const token = localStorage.getItem("token");

  const fetchCourses = async () => {
    setLoadingCourses(true);
    try {
      const res = await axios.get("http://localhost:3001/api/courses/my", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCourses(res.data.data || []);
    } catch (err) {
      console.error("Error fetching courses:", err);
    } finally {
      setLoadingCourses(false);
    }
  };

  const fetchLessons = async (courseId: string) => {
    setLoadingLessons(true);
    try {
      const res = await axios.get(
        `http://localhost:3001/api/lessons/course/${courseId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = res.data.data || [];
      setLessons(data);
      const nextOrder = data.length
        ? Math.max(...data.map((l: Lesson) => l.order)) + 1
        : 1;
      setNewLesson((prev) => ({ ...prev, order: nextOrder }));
    } catch (err) {
      console.error("Error fetching lessons:", err);
    } finally {
      setLoadingLessons(false);
    }
  };

  const handleAddLesson = async () => {
    if (!newLesson.title.trim() || !newLesson.content.trim()) {
      alert("Please fill all fields");
      return;
    }

    setIsSubmitting(true);

    try {
      let uploadedFileInfo = null;
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await axios.post(
          "http://localhost:3001/api/lessons/upload",
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
          },
        );
        uploadedFileInfo = uploadRes.data.data;
      }

      const payload = {
        ...newLesson,
        course_id: selectedCourseId,
        attachments: uploadedFileInfo
          ? JSON.stringify([uploadedFileInfo])
          : JSON.stringify([]),
      };

      await axios.post("http://localhost:3001/api/lessons", payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      setNewLesson({
        title: "",
        content: "",
        order: newLesson.order + 1,
        duration: 10,
      });
      setFile(null);
      await fetchLessons(selectedCourseId);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Error adding lesson");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateLesson = async () => {
    if (!editingLesson) return;
    setIsSubmitting(true);

    try {
      let uploadedFileInfo = null;
      if (file) {
        const formData = new FormData();
        formData.append("attachments", file);
        const uploadRes = await axios.post(
          "http://localhost:3001/api/lessons/upload",
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
          },
        );
        uploadedFileInfo = uploadRes.data.data;
      }

      const payload = new FormData();
      payload.append("title", newLesson.title);
      payload.append("content", newLesson.content);
      payload.append("order", String(newLesson.order));
      payload.append("duration", String(newLesson.duration));
      payload.append(
        "attachments",
        JSON.stringify([
          ...(editingLesson.attachments || []),
          ...(uploadedFileInfo ? [uploadedFileInfo] : []),
        ]),
      );

      await axios.put(
        `http://localhost:3001/api/lessons/${editingLesson._id}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setEditingLesson(null);
      setFile(null);
      setNewLesson({
        title: "",
        content: "",
        order: newLesson.order + 1,
        duration: 10,
      });
      await fetchLessons(selectedCourseId);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Error updating lesson");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm("Are you sure you want to delete this lesson?")) return;
    try {
      await axios.delete(`http://localhost:3001/api/lessons/${lessonId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchLessons(selectedCourseId);
    } catch (err) {
      alert("Error deleting lesson");
    }
  };

  // Quiz Management Functions
  const handleCreateQuiz = (lessonId: string) => {
    setSelectedLessonForQuiz(lessonId);
    setEditingQuiz(null);
    setNewQuiz({
      title: "",
      description: "",
      lesson_id: lessonId,
      passing_score: 70,
      time_limit: 30,
      max_attempts: 3,
      is_active: true,
      shuffle_questions: false,
      show_results: true,
      show_correct_answers: true,
      allow_review: true,
      randomize_options: false,
      questions: []
    });
    setShowQuizForm(true);
  };

  const handleEditQuiz = async (lessonId: string) => {
    try {
      const res = await axios.get(`http://localhost:3001/api/quizzes/lesson/${lessonId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEditingQuiz(res.data.data);
      setNewQuiz(res.data.data);
      setSelectedLessonForQuiz(lessonId);
      setShowQuizForm(true);
    } catch (err) {
      alert("Error fetching quiz data");
    }
  };

  const addQuestion = () => {
    const newQuestion: QuizQuestion = {
      question_text: "",
      options: ["", ""],
      correct_answer: 0,
      type: 'mcq',
      points: 1,
      explanation: ""
    };
    setNewQuiz(prev => ({
      ...prev,
      questions: [...(prev.questions || []), newQuestion]
    }));
  };

  const updateQuestion = (index: number, field: keyof QuizQuestion, value: any) => {
    setNewQuiz(prev => ({
      ...prev,
      questions: prev.questions?.map((q, i) => 
        i === index ? { ...q, [field]: value } : q
      ) || []
    }));
  };

  const removeQuestion = (index: number) => {
    setNewQuiz(prev => ({
      ...prev,
      questions: prev.questions?.filter((_, i) => i !== index) || []
    }));
  };

  const addOption = (questionIndex: number) => {
    setNewQuiz(prev => ({
      ...prev,
      questions: prev.questions?.map((q, i) => 
        i === questionIndex ? { ...q, options: [...q.options, ""] } : q
      ) || []
    }));
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    setNewQuiz(prev => ({
      ...prev,
      questions: prev.questions?.map((q, i) => 
        i === questionIndex ? { 
          ...q, 
          options: q.options.filter((_, oi) => oi !== optionIndex),
          correct_answer: typeof q.correct_answer === 'number' && q.correct_answer >= optionIndex 
            ? Math.max(0, q.correct_answer - 1) 
            : q.correct_answer
        } : q
      ) || []
    }));
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    setNewQuiz(prev => ({
      ...prev,
      questions: prev.questions?.map((q, i) => 
        i === questionIndex ? { 
          ...q, 
          options: q.options.map((opt, oi) => oi === optionIndex ? value : opt)
        } : q
      ) || []
    }));
  };

  const handleSaveQuiz = async () => {
    if (!newQuiz.title?.trim()) {
      alert("Please enter a quiz title");
      return;
    }

    if (!newQuiz.questions?.length) {
      alert("Please add at least one question");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingQuiz) {
        await axios.put(`http://localhost:3001/api/quizzes/${editingQuiz._id}`, newQuiz, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post("http://localhost:3001/api/quizzes", newQuiz, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      setShowQuizForm(false);
      setEditingQuiz(null);
      await fetchLessons(selectedCourseId);
      alert(editingQuiz ? "Quiz updated successfully!" : "Quiz created successfully!");
    } catch (err: any) {
      alert(err?.response?.data?.message || "Error saving quiz");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm("Are you sure you want to delete this quiz?")) return;
    try {
      await axios.delete(`http://localhost:3001/api/quizzes/${quizId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchLessons(selectedCourseId);
      alert("Quiz deleted successfully!");
    } catch (err) {
      alert("Error deleting quiz");
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourseId) fetchLessons(selectedCourseId);
  }, [selectedCourseId]);

  useEffect(() => {
    if (editingLesson) {
      setNewLesson({
        title: editingLesson.title,
        content: editingLesson.content,
        order: editingLesson.order,
        duration: editingLesson.duration,
      });
      setFile(null);
    }
  }, [editingLesson]);

  const selectedCourse = courses.find((c) => c._id === selectedCourseId);

  return (
    <AppLayout>
      <div className="container py-6">
        <h1 className="text-2xl font-bold mb-4">Manage Lessons & Quizzes</h1>

        <div className="mb-6">
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="p-2 border rounded w-full sm:w-auto"
          >
            <option value="">Select a course</option>
            {courses.map((course) => (
              <option key={course._id} value={course._id}>
                {course.title}
              </option>
            ))}
          </select>
        </div>

        {selectedCourseId && (
          <>
            <h2 className="text-xl font-semibold mb-2">
              Lessons for: {selectedCourse?.title}
            </h2>

            {/* Lesson Form */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>
                  {editingLesson ? "Edit Lesson" : "Add New Lesson"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Lesson Title"
                  value={newLesson.title}
                  onChange={(e) =>
                    setNewLesson({ ...newLesson, title: e.target.value })
                  }
                  disabled={isSubmitting}
                />
                <Textarea
                  placeholder="Lesson Content"
                  value={newLesson.content}
                  onChange={(e) =>
                    setNewLesson({ ...newLesson, content: e.target.value })
                  }
                  disabled={isSubmitting}
                />
                <Input
                  type="number"
                  placeholder="Order"
                  value={newLesson.order}
                  onChange={(e) =>
                    setNewLesson({
                      ...newLesson,
                      order: Number(e.target.value),
                    })
                  }
                  disabled={isSubmitting}
                />
                <Input
                  type="number"
                  placeholder="Duration (minutes)"
                  value={newLesson.duration}
                  onChange={(e) =>
                    setNewLesson({
                      ...newLesson,
                      duration: Number(e.target.value),
                    })
                  }
                  disabled={isSubmitting}
                />
                <Input
                  type="file"
                  accept="video/*,application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  disabled={isSubmitting}
                />
                {file && file.type.startsWith("video/") && (
                  <video className="w-full mt-2" controls height="240">
                    <source src={URL.createObjectURL(file)} type={file.type} />
                    Your browser does not support the video tag.
                  </video>
                )}
                <div className="flex gap-2">
                  <Button
                    onClick={
                      editingLesson ? handleUpdateLesson : handleAddLesson
                    }
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? editingLesson
                        ? "Updating..."
                        : "Adding..."
                      : editingLesson
                        ? "Update Lesson"
                        : "Add Lesson"}
                  </Button>
                  {editingLesson && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingLesson(null);
                        setNewLesson({
                          title: "",
                          content: "",
                          order: newLesson.order + 1,
                          duration: 10,
                        });
                        setFile(null);
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quiz Form Modal */}
            {showQuizForm && (
              <Card className="mb-6 border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HelpCircle className="h-5 w-5" />
                    {editingQuiz ? "Edit Quiz" : "Create New Quiz"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Quiz Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      placeholder="Quiz Title"
                      value={newQuiz.title || ""}
                      onChange={(e) => setNewQuiz(prev => ({ ...prev, title: e.target.value }))}
                    />
                    <Input
                      type="number"
                      placeholder="Passing Score (%)"
                      value={newQuiz.passing_score || 70}
                      onChange={(e) => setNewQuiz(prev => ({ ...prev, passing_score: Number(e.target.value) }))}
                    />
                  </div>

                  <Textarea
                    placeholder="Quiz Description"
                    value={newQuiz.description || ""}
                    onChange={(e) => setNewQuiz(prev => ({ ...prev, description: e.target.value }))}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Time Limit (minutes)
                      </Label>
                      <Input
                        type="number"
                        value={newQuiz.time_limit || 30}
                        onChange={(e) => setNewQuiz(prev => ({ ...prev, time_limit: Number(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <Label className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Max Attempts
                      </Label>
                      <Input
                        type="number"
                        value={newQuiz.max_attempts || 3}
                        onChange={(e) => setNewQuiz(prev => ({ ...prev, max_attempts: Number(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <Label className="flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Quiz Status
                      </Label>
                      <Select value={newQuiz.is_active ? "active" : "inactive"} onValueChange={(value) => setNewQuiz(prev => ({ ...prev, is_active: value === "active" }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Quiz Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="shuffle"
                          checked={newQuiz.shuffle_questions || false}
                          onCheckedChange={(checked) => setNewQuiz(prev => ({ ...prev, shuffle_questions: checked as boolean }))}
                        />
                        <Label htmlFor="shuffle">Shuffle Questions</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="randomize"
                          checked={newQuiz.randomize_options || false}
                          onCheckedChange={(checked) => setNewQuiz(prev => ({ ...prev, randomize_options: checked as boolean }))}
                        />
                        <Label htmlFor="randomize">Randomize Options</Label>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="show_results"
                          checked={newQuiz.show_results || false}
                          onCheckedChange={(checked) => setNewQuiz(prev => ({ ...prev, show_results: checked as boolean }))}
                        />
                        <Label htmlFor="show_results">Show Results</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="show_answers"
                          checked={newQuiz.show_correct_answers || false}
                          onCheckedChange={(checked) => setNewQuiz(prev => ({ ...prev, show_correct_answers: checked as boolean }))}
                        />
                        <Label htmlFor="show_answers">Show Correct Answers</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="allow_review"
                          checked={newQuiz.allow_review || false}
                          onCheckedChange={(checked) => setNewQuiz(prev => ({ ...prev, allow_review: checked as boolean }))}
                        />
                        <Label htmlFor="allow_review">Allow Review</Label>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Questions Section */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">Questions ({newQuiz.questions?.length || 0})</h3>
                      <Button onClick={addQuestion} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Question
                      </Button>
                    </div>

                    {newQuiz.questions?.map((question, qIndex) => (
                      <Card key={qIndex} className="mb-4 border-gray-200">
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start mb-4">
                            <h4 className="font-medium">Question {qIndex + 1}</h4>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => removeQuestion(qIndex)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="md:col-span-2">
                                <Label>Question Text</Label>
                                <Textarea
                                  value={question.question_text}
                                  onChange={(e) => updateQuestion(qIndex, 'question_text', e.target.value)}
                                  placeholder="Enter your question..."
                                />
                              </div>
                              <div>
                                <Label>Question Type</Label>
                                <Select
                                  value={question.type}
                                  onValueChange={(value) => {
                                    updateQuestion(qIndex, 'type', value);
                                    // Reset options based on type
                                    if (value === 'true_false') {
                                      updateQuestion(qIndex, 'options', ['True', 'False']);
                                      updateQuestion(qIndex, 'correct_answer', 0);
                                    } else if (value === 'mcq') {
                                      updateQuestion(qIndex, 'options', ['', '']);
                                      updateQuestion(qIndex, 'correct_answer', 0);
                                    } else if (value === 'multiple_select') {
                                      updateQuestion(qIndex, 'options', ['', '']);
                                      updateQuestion(qIndex, 'correct_answer', []);
                                    }
                                  }}
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
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label>Points</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={question.points}
                                  onChange={(e) => updateQuestion(qIndex, 'points', Number(e.target.value))}
                                />
                              </div>
                              <div>
                                <Label>Explanation (Optional)</Label>
                                <Input
                                  value={question.explanation}
                                  onChange={(e) => updateQuestion(qIndex, 'explanation', e.target.value)}
                                  placeholder="Explain the correct answer..."
                                />
                              </div>
                            </div>

                            {/* Options */}
                            {question.type !== 'true_false' && (
                              <div>
                                <div className="flex justify-between items-center mb-2">
                                  <Label>Options</Label>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addOption(qIndex)}
                                  >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add Option
                                  </Button>
                                </div>
                                {question.options.map((option, oIndex) => (
                                  <div key={oIndex} className="flex gap-2 mb-2">
                                    <Input
                                      value={option}
                                      onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                      placeholder={`Option ${oIndex + 1}`}
                                    />
                                    {question.type === 'mcq' && (
                                      <div className="flex items-center">
                                        <input
                                          type="radio"
                                          name={`correct-${qIndex}`}
                                          checked={question.correct_answer === oIndex}
                                          onChange={() => updateQuestion(qIndex, 'correct_answer', oIndex)}
                                          className="mr-2"
                                        />
                                        <Label className="text-sm">Correct</Label>
                                      </div>
                                    )}
                                    {question.type === 'multiple_select' && (
                                      <div className="flex items-center">
                                        <Checkbox
                                          checked={Array.isArray(question.correct_answer) && question.correct_answer.includes(oIndex)}
                                          onCheckedChange={(checked) => {
                                            const currentAnswers = Array.isArray(question.correct_answer) ? question.correct_answer : [];
                                            const newAnswers = checked
                                              ? [...currentAnswers, oIndex]
                                              : currentAnswers.filter(a => a !== oIndex);
                                            updateQuestion(qIndex, 'correct_answer', newAnswers);
                                          }}
                                        />
                                        <Label className="text-sm ml-2">Correct</Label>
                                      </div>
                                    )}
                                    {question.options.length > 2 && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => removeOption(qIndex, oIndex)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* True/False Correct Answer */}
                            {question.type === 'true_false' && (
                              <div>
                                <Label>Correct Answer</Label>
                                <Select
                                  value={question.correct_answer?.toString()}
                                  onValueChange={(value) => updateQuestion(qIndex, 'correct_answer', Number(value))}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="0">True</SelectItem>
                                    <SelectItem value="1">False</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Quiz Form Actions */}
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleSaveQuiz} disabled={isSubmitting}>
                      {isSubmitting ? "Saving..." : editingQuiz ? "Update Quiz" : "Create Quiz"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowQuizForm(false);
                        setEditingQuiz(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Lessons List */}
            <div className="space-y-4">
              {loadingLessons ? (
                <p>Loading lessons...</p>
              ) : lessons.length === 0 ? (
                <p>No lessons added yet.</p>
              ) : (
                lessons.map((lesson) => (
                  <Card key={lesson._id}>
                    <CardContent className="py-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-semibold">{lesson.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            Order: {lesson.order}, Duration: {lesson.duration} mins
                          </p>
                          {lesson.quiz && (
                            <Badge variant="secondary" className="mt-1">
                              <HelpCircle className="h-3 w-3 mr-1" />
                              Has Quiz
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setEditingLesson(lesson)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          {lesson.quiz ? (
                            <Button
                              variant="secondary"
                              onClick={() => handleEditQuiz(lesson._id)}
                            >
                              <HelpCircle className="h-4 w-4 mr-1" />
                              Edit Quiz
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              onClick={() => handleCreateQuiz(lesson._id)}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Quiz
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            onClick={() => handleDeleteLesson(lesson._id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>

                      {lesson.attachments?.map((att, i) => {
                        const fileUrl = `http://localhost:3001${att.url}`;
                        return (
                          <div key={i} className="text-sm mt-1">
                            {att.type.startsWith("video/") ? (
                              <video controls className="w-full max-w-md">
                                <source src={fileUrl} type={att.type} />
                                Your browser does not support the video tag.
                              </video>
                            ) : (
                              <a
                                className="text-blue-600 underline"
                                href={fileUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {att.filename}
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default ManageLessons;