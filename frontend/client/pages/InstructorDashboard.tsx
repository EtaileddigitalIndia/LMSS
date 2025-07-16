import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Plus, 
  Pencil, 
  Trash, 
  Eye, 
  BarChart3, 
  Users, 
  DollarSign, 
  TrendingUp,
  BookOpen,
  Video,
  Edit,
  Settings,
  Upload
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";

interface Course {
  _id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  tags: string[];
  price: number;
  thumbnail_url: string | null;
  status: string;
  created_by: any;
  enrolled_students_count: number;
  total_lessons: number;
  duration: number;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function InstructorDashboard() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("courses");
  const [statsData, setStatsData] = useState({
    totalCourses: 0,
    totalStudents: 0,
    totalRevenue: 0,
    publishedCourses: 0
  });

  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [newCourse, setNewCourse] = useState({
    title: "",
    description: "",
    category: "",
    difficulty: "",
    tags: "",
    price: "",
  });

  const fetchMyCourses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:3001/api/courses/my", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setCourses(data.data.courses || data.data);
        
        // Calculate stats
        const courses = data.data.courses || data.data;
        const stats = {
          totalCourses: courses.length,
          totalStudents: courses.reduce((sum: number, course: Course) => sum + course.enrolled_students_count, 0),
          totalRevenue: courses.reduce((sum: number, course: Course) => sum + (course.price * course.enrolled_students_count), 0),
          publishedCourses: courses.filter((course: Course) => course.status === 'published').length
        };
        setStatsData(stats);
      }
    } catch (err) {
      console.error("Failed to fetch courses:", err);
      toast.error("Failed to fetch courses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyCourses();
  }, []);

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnail(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const handleCreateOrUpdateCourse = async () => {
    const formData = new FormData();
    formData.append("title", newCourse.title);
    formData.append("description", newCourse.description);
    formData.append("category", newCourse.category);
    formData.append("difficulty", newCourse.difficulty);
    formData.append("tags", newCourse.tags);
    formData.append("price", newCourse.price);
    if (thumbnail) {
      formData.append("thumbnail", thumbnail);
    }

    const token = localStorage.getItem("token");
    const url = isEditMode
      ? `http://localhost:3001/api/courses/${editingCourse?._id}`
      : "http://localhost:3001/api/courses";
    const method = isEditMode ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        toast.success(isEditMode ? "Course updated!" : "Course created!");
        resetForm();
        fetchMyCourses();
        
        // Navigate to course builder for new courses
        if (!isEditMode && data.data._id) {
          navigate(`/course-builder/${data.data._id}`);
        }
      } else {
        toast.error(data.message || "Operation failed");
      }
    } catch (err) {
      console.error("Error:", err);
      toast.error("Operation failed");
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm("Are you sure you want to delete this course?")) return;

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`http://localhost:3001/api/courses/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Course deleted");
        fetchMyCourses();
      } else {
        toast.error(data.message || "Deletion failed");
      }
    } catch (err) {
      console.error("Error deleting course:", err);
      toast.error("Failed to delete course");
    }
  };

  const toggleCourseStatus = async (courseId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';
    const token = localStorage.getItem("token");
    
    try {
      const res = await fetch(`http://localhost:3001/api/courses/${courseId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success(`Course ${newStatus}!`);
        fetchMyCourses();
      } else {
        toast.error(data.message || "Failed to update status");
      }
    } catch (err) {
      console.error("Error updating status:", err);
      toast.error("Failed to update course status");
    }
  };

  const openEditDialog = (course: Course) => {
    setEditingCourse(course);
    setIsEditMode(true);
    setShowCreateCourse(true);
    setNewCourse({
      title: course.title,
      description: course.description,
      category: course.category,
      difficulty: course.difficulty,
      tags: course.tags.join(", "),
      price: course.price.toString(),
    });
    setThumbnail(null);
    setThumbnailPreview(course.thumbnail_url ? `http://localhost:3001${course.thumbnail_url}` : null);
  };

  const resetForm = () => {
    setShowCreateCourse(false);
    setIsEditMode(false);
    setEditingCourse(null);
    setNewCourse({ title: "", description: "", category: "", difficulty: "", tags: "", price: "" });
    setThumbnail(null);
    setThumbnailPreview(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <AppLayout>
      <div className="container py-8 px-4 max-w-7xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Instructor Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage your courses and track your progress</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/course-builder')}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Course
            </Button>
            <Dialog open={showCreateCourse} onOpenChange={setShowCreateCourse}>
              <DialogTrigger asChild>
                <Button size="lg">
                  <Plus className="mr-2 h-5 w-5" />
                  Quick Create
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{isEditMode ? "Edit Course" : "Create New Course"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Course Title</Label>
                    <Input
                      id="title"
                      value={newCourse.title}
                      onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newCourse.description}
                      onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                      rows={4}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={newCourse.category}
                        onValueChange={(value) => setNewCourse({ ...newCourse, category: value })}
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
                    <div>
                      <Label htmlFor="difficulty">Difficulty</Label>
                      <Select
                        value={newCourse.difficulty}
                        onValueChange={(value) => setNewCourse({ ...newCourse, difficulty: value })}
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
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="price">Price ($)</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={newCourse.price}
                        onChange={(e) => setNewCourse({ ...newCourse, price: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="tags">Tags (comma separated)</Label>
                      <Input
                        id="tags"
                        value={newCourse.tags}
                        onChange={(e) => setNewCourse({ ...newCourse, tags: e.target.value })}
                        placeholder="react, javascript, web"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Thumbnail</Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailChange}
                      className="hidden"
                    />
                    <div className="flex items-center gap-4 mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Thumbnail
                      </Button>
                      {thumbnailPreview && (
                        <img
                          src={thumbnailPreview}
                          alt="Preview"
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateOrUpdateCourse}>
                      {isEditMode ? "Update Course" : "Create & Build"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsData.totalCourses}</div>
              <p className="text-xs text-muted-foreground">
                {statsData.publishedCourses} published
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsData.totalStudents}</div>
              <p className="text-xs text-muted-foreground">
                Across all courses
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(statsData.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                From course sales
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Revenue/Course</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsData.totalCourses > 0 ? formatCurrency(statsData.totalRevenue / statsData.totalCourses) : formatCurrency(0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Per course
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="courses">My Courses</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="courses" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Course Management</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading courses...</div>
                ) : courses.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No courses yet</h3>
                    <p className="text-gray-500 mb-6">Create your first course to get started</p>
                    <Button onClick={() => navigate('/course-builder')}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Course
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {courses.map((course) => (
                      <div
                        key={course._id}
                        className="flex items-center gap-6 p-6 border rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div className="w-32 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          {course.thumbnail_url ? (
                            <img
                              src={`http://localhost:3001${course.thumbnail_url}`}
                              alt={course.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <BookOpen className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-gray-900 truncate">
                                {course.title}
                              </h3>
                              <p className="text-gray-600 mt-1 line-clamp-2">
                                {course.description}
                              </p>
                              <div className="flex items-center gap-4 mt-3">
                                <Badge variant={course.status === 'published' ? 'default' : 'secondary'}>
                                  {course.status}
                                </Badge>
                                {course.featured && <Badge variant="outline">Featured</Badge>}
                                <span className="text-sm text-gray-500">
                                  {course.enrolled_students_count} students
                                </span>
                                <span className="text-sm text-gray-500">
                                  {course.total_lessons} lessons
                                </span>
                                <span className="text-sm text-gray-500">
                                  {Math.round(course.duration / 60)}h total
                                </span>
                                <span className="text-lg font-semibold text-green-600">
                                  {formatCurrency(course.price)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/course-builder/${course._id}`)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/course/${course._id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleCourseStatus(course._id, course.status)}
                          >
                            {course.status === 'published' ? 'Unpublish' : 'Publish'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteCourse(course._id)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Analytics Dashboard</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <BarChart3 className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Coming Soon</h3>
                  <p className="text-gray-500">
                    Detailed analytics and insights for your courses will be available soon.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Instructor Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Settings className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Settings Coming Soon</h3>
                  <p className="text-gray-500">
                    Instructor preferences and settings will be available soon.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
