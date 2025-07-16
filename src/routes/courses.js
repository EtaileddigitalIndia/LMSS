const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

const { authenticateToken, requireInstructor } = require("../middleware/auth");
const Course = require("../models/Course");
const Lesson = require("../models/Lesson");

// ⚙️ Enhanced Multer setup for multiple file types
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'thumbnail') {
      cb(null, "uploads/thumbnails/");
    } else if (file.fieldname === 'resources') {
      cb(null, "uploads/resources/");
    } else {
      cb(null, "uploads/");
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'thumbnail') {
    // Only allow image files for thumbnails
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for thumbnails'), false);
    }
  } else {
    // Allow various file types for resources
    cb(null, true);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// ✅ GET all courses with advanced filtering and search
router.get("/", async (req, res) => {
  try {
    const {
      search,
      category,
      difficulty,
      minPrice,
      maxPrice,
      status,
      featured,
      sortBy,
      sortOrder,
      page = 1,
      limit = 12
    } = req.query;

    let query = {};

    // Search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter by difficulty
    if (difficulty) {
      query.difficulty = difficulty;
    }

    // Price range filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    // Status filter
    if (status) {
      query.status = status;
    } else {
      // Default to published courses for public access
      query.status = 'published';
    }

    // Featured filter
    if (featured === 'true') {
      query.featured = true;
    }

    // Sorting
    let sortOptions = {};
    if (sortBy) {
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    } else {
      sortOptions.createdAt = -1; // Default sort by newest
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const courses = await Course.find(query)
      .populate("created_by", "full_name email avatar_url")
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .select("-__v");

    const total = await Course.countDocuments(query);

    res.json({
      success: true,
      data: {
        courses,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalCourses: total,
          hasNext: skip + courses.length < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (err) {
    console.error('Error fetching courses:', err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ GET course categories
router.get("/categories", async (req, res) => {
  try {
    const categories = await Course.distinct("category");
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const count = await Course.countDocuments({ 
          category, 
          status: 'published' 
        });
        return { name: category, count };
      })
    );

    res.json({
      success: true,
      data: categoriesWithCounts.sort((a, b) => b.count - a.count)
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ GET courses created by the logged-in instructor
router.get("/my", authenticateToken, requireInstructor, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    let query = { created_by: req.user._id };
    if (status) {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const courses = await Course.find(query)
      .populate("created_by", "full_name email")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select("-__v");

    const total = await Course.countDocuments(query);

    res.json({
      success: true,
      data: {
        courses,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalCourses: total
        }
      }
    });
  } catch (error) {
    console.error("Error fetching instructor's courses:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ GET course by ID with full details
router.get("/:id", async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate("created_by", "full_name email avatar_url profile")
      .populate({
        path: "lessons",
        options: { sort: { order: 1 } },
        populate: {
          path: "quiz",
          select: "title questions.length passing_score time_limit"
        }
      })
      .select("-__v");

    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    // Calculate total duration
    const totalDuration = course.lessons.reduce((total, lesson) => 
      total + (lesson.duration || 0), 0
    );

    // Add computed fields
    const courseData = {
      ...course.toObject(),
      totalDuration,
      totalLessons: course.lessons.length,
      estimatedHours: Math.round((totalDuration / 60) * 10) / 10
    };

    res.json({ success: true, data: courseData });
  } catch (error) {
    console.error("Error fetching course:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ POST create new course with enhanced file handling
router.post(
  "/",
  authenticateToken,
  requireInstructor,
  upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'resources', maxCount: 10 }
  ]),
  async (req, res) => {
    try {
      const { 
        title, 
        description, 
        category, 
        price, 
        difficulty, 
        tags,
        learning_objectives,
        prerequisites,
        target_audience
      } = req.body;

      if (!title || !description || !category || !price) {
        return res.status(400).json({ 
          success: false, 
          message: "Missing required fields" 
        });
      }

      const thumbnail_url = req.files?.thumbnail?.[0] 
        ? `/uploads/thumbnails/${req.files.thumbnail[0].filename}` 
        : null;

      const resources = req.files?.resources?.map(file => ({
        filename: file.filename,
        original_name: file.originalname,
        url: `/uploads/resources/${file.filename}`,
        size: file.size,
        type: file.mimetype
      })) || [];

      const course = new Course({
        title,
        description,
        category,
        price: parseFloat(price),
        difficulty,
        tags: tags ? tags.split(",").map((tag) => tag.trim()) : [],
        thumbnail_url,
        resources,
        learning_objectives: learning_objectives ? learning_objectives.split('\n').filter(obj => obj.trim()) : [],
        prerequisites: prerequisites ? prerequisites.split('\n').filter(req => req.trim()) : [],
        target_audience: target_audience ? target_audience.split('\n').filter(aud => aud.trim()) : [],
        created_by: req.user._id,
      });

      await course.save();
      
      const populatedCourse = await Course.findById(course._id)
        .populate("created_by", "full_name email");

      res.status(201).json({ success: true, data: populatedCourse });

    } catch (error) {
      console.error("❌ Error creating course:", error);
      res.status(500).json({ 
        success: false, 
        message: "Server error", 
        error: error.message 
      });
    }
  }
);

// ✅ PUT update course with enhanced features
router.put(
  "/:id",
  authenticateToken,
  upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'resources', maxCount: 10 }
  ]),
  async (req, res) => {
    try {
      const course = await Course.findById(req.params.id);

      if (!course) {
        return res.status(404).json({ success: false, message: "Course not found" });
      }

      if (
        course.created_by.toString() !== req.user._id.toString() &&
        req.user.role !== "admin"
      ) {
        return res.status(403).json({ success: false, message: "Not authorized" });
      }

      const {
        title,
        description,
        category,
        price,
        difficulty,
        tags,
        status,
        featured,
        learning_objectives,
        prerequisites,
        target_audience
      } = req.body;

      // Update basic fields
      if (title) course.title = title;
      if (description) course.description = description;
      if (category) course.category = category;
      if (price) course.price = parseFloat(price);
      if (difficulty) course.difficulty = difficulty;
      if (tags) course.tags = tags.split(',').map(tag => tag.trim());
      if (status) course.status = status;
      if (featured !== undefined) course.featured = featured === 'true';

      // Update structured fields
      if (learning_objectives) {
        course.learning_objectives = learning_objectives.split('\n').filter(obj => obj.trim());
      }
      if (prerequisites) {
        course.prerequisites = prerequisites.split('\n').filter(req => req.trim());
      }
      if (target_audience) {
        course.target_audience = target_audience.split('\n').filter(aud => aud.trim());
      }

      // Handle thumbnail update
      if (req.files?.thumbnail?.[0]) {
        course.thumbnail_url = `/uploads/thumbnails/${req.files.thumbnail[0].filename}`;
      }

      // Handle resources update
      if (req.files?.resources) {
        const newResources = req.files.resources.map(file => ({
          filename: file.filename,
          original_name: file.originalname,
          url: `/uploads/resources/${file.filename}`,
          size: file.size,
          type: file.mimetype
        }));
        course.resources = [...(course.resources || []), ...newResources];
      }

      await course.save();

      const updatedCourse = await Course.findById(course._id)
        .populate("created_by", "full_name email");

      res.json({ success: true, data: updatedCourse });
    } catch (error) {
      console.error("❌ Error updating course:", error);
      res.status(500).json({ 
        success: false, 
        message: "Server error", 
        error: error.message 
      });
    }
  }
);

// ✅ PUT update course status (publish/unpublish)
router.put("/:id/status", authenticateToken, requireInstructor, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['draft', 'published', 'archived'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be 'draft', 'published', or 'archived'"
      });
    }

    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    if (course.created_by.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    // Validate course has required content before publishing
    if (status === 'published') {
      const lessonCount = await Lesson.countDocuments({ course_id: course._id });
      if (lessonCount === 0) {
        return res.status(400).json({
          success: false,
          message: "Cannot publish course without lessons"
        });
      }
    }

    course.status = status;
    await course.save();

    res.json({ 
      success: true, 
      message: `Course ${status} successfully`,
      data: course 
    });
  } catch (error) {
    console.error("Error updating course status:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ DELETE course resource
router.delete("/:id/resources/:resourceId", authenticateToken, requireInstructor, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    if (course.created_by.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    course.resources = course.resources.filter(
      resource => resource._id.toString() !== req.params.resourceId
    );

    await course.save();

    res.json({ 
      success: true, 
      message: "Resource deleted successfully",
      data: course 
    });
  } catch (error) {
    console.error("Error deleting resource:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ DELETE course
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    if (
      course.created_by.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    // Delete all lessons associated with the course
    await Lesson.deleteMany({ course_id: course._id });

    await course.deleteOne();

    res.json({ success: true, message: "Course and all associated lessons deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting course:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
});

module.exports = router;
