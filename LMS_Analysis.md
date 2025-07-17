# Global LMS + Student Portal - Repository Analysis

## Overview
This is a comprehensive full-stack Learning Management System (LMS) with a student portal built using modern web technologies. The system supports multiple user types with distinct roles and capabilities.

## Architecture

### Backend (Node.js/Express API)
- **Framework**: Express.js with Node.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT-based authentication with bcrypt password hashing
- **Security**: Helmet, CORS, rate limiting, input validation
- **File Upload**: Multer for handling file uploads
- **PDF Generation**: jsPDF for certificate generation
- **Email**: Nodemailer for email notifications

### Frontend (React SPA)
- **Framework**: React 18 with TypeScript
- **Routing**: React Router 6 (SPA mode)
- **Build Tool**: Vite
- **Styling**: TailwindCSS 3 with Radix UI components
- **State Management**: React Query (@tanstack/react-query)
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React
- **3D Graphics**: Three.js with React Three Fiber

## User Types & Roles

The system supports 7 distinct user roles:

1. **Admin** - System administration
2. **Instructor** - Course creation and management
3. **Student** - Course enrollment and learning (primary role)
4. **Guest** - Limited access
5. **Parent** - Monitoring student progress
6. **Reseller** - Course distribution
7. **TA** (Teaching Assistant) - Assisting instructors

## Core Features

### Authentication & User Management
- Secure registration and login system
- Role-based access control
- Password reset functionality
- Email verification
- User profile management with avatar support
- Social links integration (LinkedIn, Twitter, GitHub, website)

### Course Management
- **Course Creation**: Instructors can create courses with:
  - Title, description, thumbnail
  - Pricing and categories
  - Difficulty levels (beginner, intermediate, advanced)
  - Tags and topics
  - Status management (draft, published, archived)
- **Course Features**:
  - Enrolled student tracking
  - Rating and review system
  - Duration tracking
  - Featured course highlighting
  - Certificate templates

### Learning Content
- **Lessons**: Structured content with:
  - Rich text content
  - Video embedding
  - File attachments
  - Resource links
  - Order/sequence management
- **Quizzes**: Interactive assessments
- **Progress Tracking**: Detailed learning analytics

### Enrollment System
- Student course enrollment
- Payment status tracking
- Progress monitoring
- Course completion tracking
- Access control and expiration

### Certificates
- Automated certificate generation
- PDF certificate creation
- Certificate verification
- Template customization

### Analytics & Reporting
- Student progress analytics
- Course performance metrics
- Learning insights
- Dashboard views for different user types

## Key Pages & Interfaces

### Student Portal
- **Dashboard**: Personal learning overview
- **Course Catalog**: Browse and search courses
- **My Learning**: Enrolled courses and progress
- **Course Detail**: Course information and enrollment
- **Lesson Viewer**: Interactive lesson consumption
- **Quiz Interface**: Assessment taking
- **Profile Management**: Personal information and settings
- **Certificates**: View and download earned certificates

### Instructor Dashboard
- Course creation and management
- Lesson management
- Student analytics
- Content organization

### Admin Dashboard
- System-wide analytics
- User management
- Course approval and moderation
- Platform administration

## Technical Highlights

### Backend API Endpoints
- `/api/auth` - Authentication (login, register, logout)
- `/api/courses` - Course management
- `/api/lessons` - Lesson content management
- `/api/quizzes` - Quiz and assessment handling
- `/api/users` - User profile management
- `/api/enrollments` - Course enrollment management
- `/api/certificates` - Certificate generation and retrieval
- `/api/analytics` - Learning analytics and reporting

### Database Schema
- **Users**: Comprehensive user profiles with role-based access
- **Courses**: Rich course metadata with instructor relationships
- **Lessons**: Structured learning content with media support
- **Enrollments**: Student-course relationships with progress tracking
- **Quizzes**: Assessment structure and scoring
- **Certificates**: Achievement tracking and verification

### Security Features
- JWT token-based authentication
- Password hashing with bcrypt
- Rate limiting to prevent abuse
- CORS configuration for cross-origin requests
- Input validation and sanitization
- Helmet for security headers

### File Management
- Upload handling for course materials
- Image and document storage
- Video content embedding
- Attachment management

## Development Setup
- **Backend**: Node.js with nodemon for development
- **Frontend**: Vite dev server with hot reload
- **Database**: MongoDB connection with Mongoose
- **Environment**: dotenv for configuration management

## Deployment Features
- Production-ready Express server
- Static file serving
- Environment-based configuration
- Docker support (evident from .dockerignore)
- Netlify deployment configuration

## Modern Development Practices
- TypeScript for type safety
- Component-based architecture
- Responsive design with TailwindCSS
- Modern React patterns with hooks
- API-first design approach
- Modular code organization
- Git version control with proper .gitignore

This LMS represents a comprehensive educational platform capable of serving institutions, online course creators, and learners globally with professional-grade features and modern web standards.