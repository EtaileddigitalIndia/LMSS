const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
require("dotenv").config();
const connectDB = require("./config/database");

const authRoutes = require("./routes/auth");
const courseRoutes = require("./routes/courses");
const lessonRoutes = require("./routes/lessons");
const quizRoutes = require("./routes/quizzes");
const userRoutes = require("./routes/users");
const certificateRoutes = require("./routes/certificates");
const analyticsRoutes = require("./routes/analytics");
const enrollmentRoutes = require("./routes/enrollments");
const quizAttemptRoutes = require("./routes/quizAttempt");
const progressRoutes = require("./routes/progress");
const contactRoutes = require("./routes/contact");
const affiliationRoutes = require("./routes/affiliations");
const franchiseRoutes = require("./routes/franchise");
const notificationRoutes = require("./routes/notifications");

const app = express();
const PORT = process.env.PORT || 3001;

// ✅ Connect to MongoDB
connectDB();

// ✅ Security middleware with CSP allowing iframe from React
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:"],
        frameSrc: ["'self'", process.env.FRONTEND_URL],
        frameAncestors: ["'self'", process.env.FRONTEND_URL],
        objectSrc: ["'none'"],
      },
    },
  })
);

// ✅ CORS configuration
const allowedOrigins = [
  "http://localhost:3000",
  process.env.FRONTEND_URL,
  "https://eduflowstudentportal.netlify.app",
].filter(Boolean);

console.log("🔧 CORS Configuration:", {
  allowedOrigins,
  FRONTEND_URL: process.env.FRONTEND_URL,
  NODE_ENV: process.env.NODE_ENV,
});

// Log all environment variables for debugging
console.log("🔧 Environment Variables:", {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  FRONTEND_URL: process.env.FRONTEND_URL,
  MONGODB_URI_PROD: process.env.MONGODB_URI_PROD ? "Set" : "Not set",
});

app.use(
  cors({
    origin: function (origin, callback) {
      console.log("🌐 CORS Request from:", origin);

      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        console.log("✅ Allowing request with no origin");
        return callback(null, true);
      }

      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        console.log("✅ Allowing request from:", origin);
        return callback(null, true);
      }

      // Block the request
      console.log("❌ CORS Blocked:", origin);
      console.log("❌ Allowed origins:", allowedOrigins);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// ✅ Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: "Too many requests from this IP, please try again later.",
});
app.use(limiter);

// ✅ Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ✅ Serve lesson uploads
app.use(
  "/uploads/lessons",
  (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", process.env.FRONTEND_URL);
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
  express.static(path.join(__dirname, "uploads", "lessons"))
);

// ✅ Serve general profile uploads (legacy)
app.use(
  "/uploads",
  (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", process.env.FRONTEND_URL);
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
  express.static(path.join(__dirname, "..", "uploads"))
);

// ✅ Serve affiliation logos from /logo
app.use(
  "/logo",
  (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", process.env.FRONTEND_URL);
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
  express.static(path.join(__dirname, "logo"))
);

// ✅ Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Global LMS API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    database: "MongoDB",
  });
});

// ✅ API routes
app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/lessons", lessonRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/users", userRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/quiz-attempts", quizAttemptRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/affiliations", affiliationRoutes);
app.use("/api/franchise", franchiseRoutes);
app.use("/api/notifications", notificationRoutes);

// ✅ Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});

// ✅ 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Global LMS API server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🗄️  Database: MongoDB`);
});
