import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { AuthProvider } from "@/AuthContext"; 

import Index from "./pages/Index";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import CourseBuilder from "./pages/CourseBuilder";
import LessonViewer from "./pages/LessonViewer";
import Quiz from "./pages/Quiz";
import MyLearning from "./pages/MyLearning";
import Profile from "./pages/Profile";
import Certificate from "./pages/Certificate";
import InstructorDashboard from "./pages/InstructorDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider> {/* ✅ WRAP EVERYTHING IN AUTH CONTEXT */}
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/course/:id" element={<CourseDetail />} />
            <Route path="/course-builder" element={<CourseBuilder />} />
            <Route path="/course-builder/:courseId" element={<CourseBuilder />} />
            <Route path="/lesson/:id" element={<LessonViewer />} />
            <Route path="/quiz/:id" element={<Quiz />} />
            <Route path="/my-learning" element={<MyLearning />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/certificate/:id" element={<Certificate />} />
            <Route
              path="/instructor-dashboard"
              element={<InstructorDashboard />}
            />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
