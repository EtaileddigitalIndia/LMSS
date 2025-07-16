import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Plus,
  Save,
  Upload,
  Video,
  FileText,
  Trash2,
  Edit,
  GripVertical,
  Eye,
  Settings,
  Users,
  Target,
  BookOpen,
  Clock,
  DollarSign,
  Image,
  Youtube,
  PlayCircle,
  Paperclip,
  X
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";

interface Course {
  _id: string;
  title: string;
  description: string;
  short_description?: string;
  category: string;
  difficulty: string;
  tags: string[];
  price: number;
  original_price?: number;
  thumbnail_url: string | null;
  status: string;
  featured: boolean;
  learning_objectives: string[];
  prerequisites: string[];
  target_audience: string[];
  resources: any[];
  lessons: Lesson[];
  intro_video?: {
    type: string;
    platform: string;
    video_id: string;
  };
  settings: {
    allow_preview: boolean;
    drip_content: boolean;
    certificate_enabled: boolean;
    discussion_enabled: boolean;
    downloadable_resources: boolean;
  };
}

interface Lesson {
  _id: string;
  title: string;
  description: string;
  content: string;
  content_type: string;
  order: number;
  duration: number;
  video_url?: string;
  video_embed_url?: string;
  video_platform?: string;
  video_id?: string;
  is_free: boolean;
  attachments: any[];
  resources: any[];
  quiz?: string;
}

export default function CourseBuilder() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Course form state
  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    short_description: "",
    category: "",
    difficulty: "",
    tags: "",
    price: "",
    original_price: "",
    learning_objectives: "",
    prerequisites: "",
    target_audience: "",
    featured: false,
    intro_video_url: "",
    intro_video_platform: "youtube",
    settings: {
      allow_preview: true,
      drip_content: false,
      certificate_enabled: true,
      discussion_enabled: true,
      downloadable_resources: true
    }
  });

  // Lesson form state
  const [lessonForm, setLessonForm] = useState({
    title: "",
    description: "",
    content: "",
    content_type: "text",
    duration: "",
    video_embed_url: "",
    video_platform: "youtube",
    is_free: false,
    resources: []
  });

  // UI state
  const [showLessonDialog, setShowLessonDialog] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [courseResources, setCourseResources] = useState<File[]>([]);
  const [lessonAttachments, setLessonAttachments] = useState<File[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resourcesInputRef = useRef<HTMLInputElement>(null);
  const lessonAttachmentsRef = useRef<HTMLInputElement>(null);

  // Fetch course data
  useEffect(() => {
    if (courseId) {
      fetchCourse();
    } else {
      setLoading(false);
    }
  }, [courseId]);

  const fetchCourse = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:3001/api/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (data.success) {
        const courseData = data.data;
        setCourse(courseData);
        setLessons(courseData.lessons || []);
        
        // Populate form
        setCourseForm({
          title: courseData.title || "",
          description: courseData.description || "",
          short_description: courseData.short_description || "",
          category: courseData.category || "",
          difficulty: courseData.difficulty || "",
          tags: courseData.tags?.join(", ") || "",
          price: courseData.price?.toString() || "",
          original_price: courseData.original_price?.toString() || "",
          learning_objectives: courseData.learning_objectives?.join("\n") || "",
          prerequisites: courseData.prerequisites?.join("\n") || "",
          target_audience: courseData.target_audience?.join("\n") || "",
          featured: courseData.featured || false,
          intro_video_url: courseData.intro_video?.type || "",
          intro_video_platform: courseData.intro_video?.platform || "youtube",
          settings: courseData.settings || {
            allow_preview: true,
            drip_content: false,
            certificate_enabled: true,
            discussion_enabled: true,
            downloadable_resources: true
          }
        });
        
        if (courseData.thumbnail_url) {
          setThumbnailPreview(`http://localhost:3001${courseData.thumbnail_url}`);
        }
      }
    } catch (error) {
      console.error("Error fetching course:", error);
      toast.error("Failed to fetch course data");
    } finally {
      setLoading(false);
    }
  };

  const saveCourse = async () => {
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();

      // Add course data
      Object.entries(courseForm).forEach(([key, value]) => {
        if (key === 'settings') {
          Object.entries(value).forEach(([settingKey, settingValue]) => {
            formData.append(`settings.${settingKey}`, settingValue.toString());
          });
        } else {
          formData.append(key, value.toString());
        }
      });

      // Add files
      if (thumbnail) {
        formData.append("thumbnail", thumbnail);
      }
      
      courseResources.forEach((file, index) => {
        formData.append("resources", file);
      });

      const url = courseId
        ? `http://localhost:3001/api/courses/${courseId}`
        : "http://localhost:3001/api/courses";
      const method = courseId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        toast.success(courseId ? "Course updated!" : "Course created!");
        if (!courseId && data.data._id) {
          navigate(`/course-builder/${data.data._id}`);
        } else {
          fetchCourse();
        }
      } else {
        toast.error(data.message || "Failed to save course");
      }
    } catch (error) {
      console.error("Error saving course:", error);
      toast.error("Failed to save course");
    }
  };

  const saveLesson = async () => {
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();

      // Add lesson data
      Object.entries(lessonForm).forEach(([key, value]) => {
        if (key === 'resources') {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value.toString());
        }
      });

      formData.append("course_id", courseId!);

      // Add attachments
      lessonAttachments.forEach((file) => {
        formData.append("attachments", file);
      });

      const url = editingLesson
        ? `http://localhost:3001/api/lessons/${editingLesson._id}`
        : "http://localhost:3001/api/lessons";
      const method = editingLesson ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        toast.success(editingLesson ? "Lesson updated!" : "Lesson created!");
        setShowLessonDialog(false);
        resetLessonForm();
        fetchCourse();
      } else {
        toast.error(data.message || "Failed to save lesson");
      }
    } catch (error) {
      console.error("Error saving lesson:", error);
      toast.error("Failed to save lesson");
    }
  };

  const deleteLesson = async (lessonId: string) => {
    if (!confirm("Are you sure you want to delete this lesson?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:3001/api/lessons/${lessonId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Lesson deleted!");
        fetchCourse();
      } else {
        toast.error(data.message || "Failed to delete lesson");
      }
    } catch (error) {
      console.error("Error deleting lesson:", error);
      toast.error("Failed to delete lesson");
    }
  };

  const reorderLessons = async (newOrder: { lessonId: string; order: number }[]) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:3001/api/lessons/course/${courseId}/reorder`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ lessonOrders: newOrder }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Lesson order updated!");
        fetchCourse();
      }
    } catch (error) {
      console.error("Error reordering lessons:", error);
      toast.error("Failed to reorder lessons");
    }
  };

  const publishCourse = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:3001/api/courses/${courseId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "published" }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Course published!");
        fetchCourse();
      } else {
        toast.error(data.message || "Failed to publish course");
      }
    } catch (error) {
      console.error("Error publishing course:", error);
      toast.error("Failed to publish course");
    }
  };

  const resetLessonForm = () => {
    setLessonForm({
      title: "",
      description: "",
      content: "",
      content_type: "text",
      duration: "",
      video_embed_url: "",
      video_platform: "youtube",
      is_free: false,
      resources: []
    });
    setEditingLesson(null);
    setLessonAttachments([]);
  };

  const openEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setLessonForm({
      title: lesson.title,
      description: lesson.description,
      content: lesson.content,
      content_type: lesson.content_type,
      duration: lesson.duration.toString(),
      video_embed_url: lesson.video_embed_url || "",
      video_platform: lesson.video_platform || "youtube",
      is_free: lesson.is_free,
      resources: lesson.resources || []
    });
    setShowLessonDialog(true);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">
              {courseId ? "Edit Course" : "Create Course"}
            </h1>
            {course && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={course.status === 'published' ? 'default' : 'secondary'}>
                  {course.status}
                </Badge>
                {course.featured && <Badge variant="outline">Featured</Badge>}
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/instructor-dashboard')}>
              Back to Dashboard
            </Button>
            <Button onClick={saveCourse}>
              <Save className="mr-2 h-4 w-4" />
              Save Course
            </Button>
            {courseId && course?.status === 'draft' && lessons.length > 0 && (
              <Button onClick={publishCourse}>
                <Eye className="mr-2 h-4 w-4" />
                Publish Course
              </Button>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Course Title *</Label>
                    <Input
                      id="title"
                      value={courseForm.title}
                      onChange={(e) => setCourseForm({...courseForm, title: e.target.value})}
                      placeholder="Enter course title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={courseForm.category}
                      onValueChange={(value) => setCourseForm({...courseForm, category: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="programming">Programming</SelectItem>
                        <SelectItem value="design">Design</SelectItem>
                        <SelectItem value="business">Business</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="data-science">Data Science</SelectItem>
                        <SelectItem value="photography">Photography</SelectItem>
                        <SelectItem value="music">Music</SelectItem>
                        <SelectItem value="health">Health & Fitness</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="short_description">Short Description</Label>
                  <Textarea
                    id="short_description"
                    value={courseForm.short_description}
                    onChange={(e) => setCourseForm({...courseForm, short_description: e.target.value})}
                    placeholder="Brief description for course cards"
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="description">Full Description *</Label>
                  <Textarea
                    id="description"
                    value={courseForm.description}
                    onChange={(e) => setCourseForm({...courseForm, description: e.target.value})}
                    placeholder="Detailed course description"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="difficulty">Difficulty Level</Label>
                    <Select
                      value={courseForm.difficulty}
                      onValueChange={(value) => setCourseForm({...courseForm, difficulty: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="tags">Tags (comma separated)</Label>
                    <Input
                      id="tags"
                      value={courseForm.tags}
                      onChange={(e) => setCourseForm({...courseForm, tags: e.target.value})}
                      placeholder="react, javascript, web development"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="thumbnail">Course Thumbnail</Label>
                  <div className="mt-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setThumbnail(file);
                          setThumbnailPreview(URL.createObjectURL(file));
                        }
                      }}
                      className="hidden"
                    />
                    <div className="flex items-center gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Image className="mr-2 h-4 w-4" />
                        Upload Thumbnail
                      </Button>
                      {thumbnailPreview && (
                        <img
                          src={thumbnailPreview}
                          alt="Thumbnail preview"
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Course Structure
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="learning_objectives">Learning Objectives (one per line)</Label>
                  <Textarea
                    id="learning_objectives"
                    value={courseForm.learning_objectives}
                    onChange={(e) => setCourseForm({...courseForm, learning_objectives: e.target.value})}
                    placeholder="What will students learn?"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="prerequisites">Prerequisites (one per line)</Label>
                  <Textarea
                    id="prerequisites"
                    value={courseForm.prerequisites}
                    onChange={(e) => setCourseForm({...courseForm, prerequisites: e.target.value})}
                    placeholder="What should students know before taking this course?"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="target_audience">Target Audience (one per line)</Label>
                  <Textarea
                    id="target_audience"
                    value={courseForm.target_audience}
                    onChange={(e) => setCourseForm({...courseForm, target_audience: e.target.value})}
                    placeholder="Who is this course for?"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Video className="h-5 w-5" />
                    Course Lessons ({lessons.length})
                  </span>
                  <Dialog open={showLessonDialog} onOpenChange={setShowLessonDialog}>
                    <DialogTrigger asChild>
                      <Button onClick={resetLessonForm}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Lesson
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>
                          {editingLesson ? "Edit Lesson" : "Create New Lesson"}
                        </DialogTitle>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="lesson_title">Lesson Title *</Label>
                            <Input
                              id="lesson_title"
                              value={lessonForm.title}
                              onChange={(e) => setLessonForm({...lessonForm, title: e.target.value})}
                              placeholder="Enter lesson title"
                            />
                          </div>
                          <div>
                            <Label htmlFor="lesson_duration">Duration (minutes)</Label>
                            <Input
                              id="lesson_duration"
                              type="number"
                              value={lessonForm.duration}
                              onChange={(e) => setLessonForm({...lessonForm, duration: e.target.value})}
                              placeholder="0"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="lesson_description">Description</Label>
                          <Textarea
                            id="lesson_description"
                            value={lessonForm.description}
                            onChange={(e) => setLessonForm({...lessonForm, description: e.target.value})}
                            placeholder="Brief lesson description"
                            rows={2}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="content_type">Content Type</Label>
                            <Select
                              value={lessonForm.content_type}
                              onValueChange={(value) => setLessonForm({...lessonForm, content_type: value})}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select content type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text">Text</SelectItem>
                                <SelectItem value="video">Video</SelectItem>
                                <SelectItem value="mixed">Mixed Content</SelectItem>
                                <SelectItem value="quiz">Quiz</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="is_free"
                              checked={lessonForm.is_free}
                              onChange={(e) => setLessonForm({...lessonForm, is_free: e.target.checked})}
                            />
                            <Label htmlFor="is_free">Free Preview</Label>
                          </div>
                        </div>

                        {(lessonForm.content_type === 'video' || lessonForm.content_type === 'mixed') && (
                          <div className="space-y-4 border rounded-lg p-4">
                            <h4 className="font-medium">Video Content</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <Label htmlFor="video_platform">Platform</Label>
                                <Select
                                  value={lessonForm.video_platform}
                                  onValueChange={(value) => setLessonForm({...lessonForm, video_platform: value})}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="youtube">YouTube</SelectItem>
                                    <SelectItem value="vimeo">Vimeo</SelectItem>
                                    <SelectItem value="direct">Direct Upload</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="md:col-span-2">
                                <Label htmlFor="video_url">Video URL</Label>
                                <Input
                                  id="video_url"
                                  value={lessonForm.video_embed_url}
                                  onChange={(e) => setLessonForm({...lessonForm, video_embed_url: e.target.value})}
                                  placeholder="https://youtube.com/watch?v=..."
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        <div>
                          <Label htmlFor="lesson_content">Lesson Content *</Label>
                          <Textarea
                            id="lesson_content"
                            value={lessonForm.content}
                            onChange={(e) => setLessonForm({...lessonForm, content: e.target.value})}
                            placeholder="Enter lesson content, notes, transcripts..."
                            rows={8}
                            className="font-mono"
                          />
                        </div>

                        <div>
                          <Label>Lesson Attachments</Label>
                          <input
                            ref={lessonAttachmentsRef}
                            type="file"
                            multiple
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              setLessonAttachments(files);
                            }}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => lessonAttachmentsRef.current?.click()}
                            className="w-full"
                          >
                            <Paperclip className="mr-2 h-4 w-4" />
                            Upload Attachments
                          </Button>
                          {lessonAttachments.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {lessonAttachments.map((file, index) => (
                                <div key={index} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                                  <span>{file.name}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setLessonAttachments(prev => prev.filter((_, i) => i !== index));
                                    }}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end gap-3">
                          <Button variant="outline" onClick={() => setShowLessonDialog(false)}>
                            Cancel
                          </Button>
                          <Button onClick={saveLesson}>
                            {editingLesson ? "Update Lesson" : "Create Lesson"}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {lessons.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Video className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No lessons created yet. Add your first lesson to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {lessons
                      .sort((a, b) => a.order - b.order)
                      .map((lesson, index) => (
                        <div
                          key={lesson._id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
                              <span className="text-sm font-medium text-gray-500">
                                {lesson.order}
                              </span>
                            </div>
                            <div>
                              <h4 className="font-medium">{lesson.title}</h4>
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {lesson.duration} min
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {lesson.content_type}
                                </Badge>
                                {lesson.is_free && (
                                  <Badge variant="secondary" className="text-xs">
                                    Free
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditLesson(lesson)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteLesson(lesson._id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pricing Tab */}
          <TabsContent value="pricing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Course Pricing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price">Current Price *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={courseForm.price}
                      onChange={(e) => setCourseForm({...courseForm, price: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="original_price">Original Price (for discounts)</Label>
                    <Input
                      id="original_price"
                      type="number"
                      step="0.01"
                      value={courseForm.original_price}
                      onChange={(e) => setCourseForm({...courseForm, original_price: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="featured"
                    checked={courseForm.featured}
                    onChange={(e) => setCourseForm({...courseForm, featured: e.target.checked})}
                  />
                  <Label htmlFor="featured">Feature this course (higher visibility)</Label>
                </div>

                {courseForm.original_price && courseForm.price && 
                 parseFloat(courseForm.original_price) > parseFloat(courseForm.price) && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-green-800">
                      <strong>Discount: </strong>
                      {Math.round(((parseFloat(courseForm.original_price) - parseFloat(courseForm.price)) / parseFloat(courseForm.original_price)) * 100)}% off
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Course Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  {Object.entries({
                    allow_preview: "Allow course preview",
                    drip_content: "Drip content (release lessons gradually)",
                    certificate_enabled: "Enable certificates",
                    discussion_enabled: "Enable discussions",
                    downloadable_resources: "Allow resource downloads"
                  }).map(([key, label]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={key}
                        checked={courseForm.settings[key as keyof typeof courseForm.settings]}
                        onChange={(e) => setCourseForm({
                          ...courseForm,
                          settings: {
                            ...courseForm.settings,
                            [key]: e.target.checked
                          }
                        })}
                      />
                      <Label htmlFor={key}>{label}</Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Course Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="border rounded-lg p-6">
                    <div className="flex gap-6">
                      {thumbnailPreview && (
                        <img
                          src={thumbnailPreview}
                          alt="Course thumbnail"
                          className="w-64 h-36 object-cover rounded-lg"
                        />
                      )}
                      <div className="flex-1">
                        <h2 className="text-2xl font-bold mb-2">{courseForm.title || "Course Title"}</h2>
                        <p className="text-gray-600 mb-4">{courseForm.short_description || courseForm.description}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <Badge>{courseForm.difficulty || "beginner"}</Badge>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {lessons.reduce((total, lesson) => total + lesson.duration, 0)} min
                          </span>
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-4 w-4" />
                            {lessons.length} lessons
                          </span>
                          <span className="text-lg font-bold text-green-600">
                            ${courseForm.price || "0"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Course Content</h3>
                    <div className="space-y-2">
                      {lessons.map((lesson) => (
                        <div key={lesson._id} className="flex items-center justify-between p-3 border rounded">
                          <div className="flex items-center gap-3">
                            <PlayCircle className="h-5 w-5 text-gray-400" />
                            <span>{lesson.title}</span>
                            {lesson.is_free && <Badge variant="secondary" className="text-xs">Free</Badge>}
                          </div>
                          <span className="text-sm text-gray-500">{lesson.duration} min</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}