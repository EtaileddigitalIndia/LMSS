const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { authenticateToken, requireInstructor, requireAdminOrInstructor } = require("../middleware/auth");
const Lesson = require("../models/Lesson");
const Course = require("../models/Course");

// Setup multer for lesson file uploads (PDF/MP4 only)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "..", "uploads", "lessons"));
  },
  filename: (req, file, cb) => {
    const name = file.originalname.replace(/\s+/g, "_").toLowerCase();
    cb(null, `${Date.now()}-${name}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["video/mp4", "application/pdf"];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only MP4 and PDF files are allowed"));
    }
    cb(null, true);
  },
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
});

// Upload file route (used in frontend for preview)
router.post(
  "/upload",
  authenticateToken,
  requireAdminOrInstructor,
  upload.single("file"),
  (req, res) => {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    const file = req.file;
    return res.status(201).json({
      success: true,
      data: {
        filename: file.filename,
        original_name: file.originalname,
        url: `/uploads/lessons/${file.filename}`,
        size: file.size,
        type: file.mimetype,
      },
    });
  }
);

// Get all lessons for a course
router.get("/course/:courseId", async (req, res) => {
  try {
    const lessons = await Lesson.find({ course_id: req.params.courseId })
      .sort({ order: 1 })
      .select("-__v");
    res.json({ success: true, data: lessons });
  } catch (error) {
    console.error("Error fetching lessons:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get a single lesson by ID
router.get("/:id", async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id)
      .populate("course_id", "title")
      .select("-__v");
    if (!lesson)
      return res
        .status(404)
        .json({ success: false, message: "Lesson not found" });
    res.json({ success: true, data: lesson });
  } catch (error) {
    console.error("Error fetching lesson:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Create lesson
router.post(
  "/",
  authenticateToken,
  requireAdminOrInstructor,
  upload.single("file"),
  async (req, res) => {
    try {
      const {
        title,
        content,
        course_id,
        duration,
        video_embed_url,
        description,
        is_free,
        resources,
        quiz,
        attachments,
      } = req.body;

      // ✅ Validate course existence and authorization
      const course = await Course.findById(course_id);
      if (!course)
        return res
          .status(404)
          .json({ success: false, message: "Course not found" });

      if (
        course.created_by.toString() !== req.user._id.toString() &&
        req.user.role !== "admin"
      ) {
        return res
          .status(403)
          .json({ success: false, message: "Not authorized" });
      }

      // ✅ Auto-increment order logic
      const lastLesson = await Lesson.find({ course_id })
        .sort({ order: -1 })
        .limit(1);
      const nextOrder = lastLesson.length ? lastLesson[0].order + 1 : 1;

      // ✅ Parse attachments
      let lessonAttachments = [];
      if (attachments) {
        lessonAttachments = JSON.parse(attachments).map((att) => ({
          ...att,
          is_downloadable: att.is_downloadable ?? false, // default false
        }));
      } else if (req.file) {
        lessonAttachments = [
          {
            filename: req.file.filename,
            original_name: req.file.originalname,
            url: `/uploads/lessons/${req.file.filename}`,
            size: req.file.size,
            type: req.file.mimetype,
          },
        ];
      }
      // ✅ Create lesson
      const lesson = new Lesson({
        title,
        content,
        course_id,
        order: nextOrder, // 🆕 Use auto-incremented value
        duration,
        video_embed_url,
        description,
        is_free,
        attachments: lessonAttachments,
        resources: resources ? JSON.parse(resources) : [],
        quiz,
      });

      await lesson.save();
      course.lessons.push(lesson._id);
      await course.save();

      res.status(201).json({ success: true, data: lesson });
    } catch (error) {
      console.error("Error creating lesson:", error.stack);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// Update lesson
router.put(
  "/:id",
  authenticateToken,
  requireAdminOrInstructor,
  upload.array("attachments", 10),
  async (req, res) => {
    try {
      const lesson = await Lesson.findById(req.params.id).populate("course_id");
      if (!lesson) {
        return res
          .status(404)
          .json({ success: false, message: "Lesson not found" });
      }

      if (
        lesson.course_id.created_by.toString() !== req.user._id.toString() &&
        req.user.role !== "admin"
      ) {
        return res
          .status(403)
          .json({ success: false, message: "Not authorized" });
      }

      let parsedResources = [];
      let parsedAttachments = [];
      try {
        if (req.body.resources)
          parsedResources = JSON.parse(req.body.resources);
        if (req.body.attachments)
          parsedAttachments = JSON.parse(req.body.attachments);
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: "Invalid JSON in resources or attachments",
        });
      }

      const uploadedAttachments = req.files.map((file) => ({
        filename: file.filename,
        original_name: file.originalname,
        url: `/uploads/lessons/${file.filename}`,
        size: file.size,
        type: file.mimetype,
      }));

      const updatedLesson = await Lesson.findByIdAndUpdate(
        req.params.id,
        {
          ...req.body,
          resources: parsedResources,
          attachments: [
            ...parsedAttachments.map((att) => ({
              ...att,
              is_downloadable: att.is_downloadable ?? false,
            })),
            ...uploadedAttachments.map((att) => ({
              ...att,
              is_downloadable: false, // default for new uploads
            })),
          ],
        },
        { new: true, runValidators: true }
      );

      res.json({ success: true, data: updatedLesson });
    } catch (error) {
      console.error("Error updating lesson:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// Delete lesson
router.delete(
  "/:id",
  authenticateToken,
  requireAdminOrInstructor,
  async (req, res) => {
    try {
      const lesson = await Lesson.findById(req.params.id).populate("course_id");
      if (!lesson)
        return res
          .status(404)
          .json({ success: false, message: "Lesson not found" });

      if (
        lesson.course_id.created_by.toString() !== req.user._id.toString() &&
        req.user.role !== "admin"
      ) {
        return res
          .status(403)
          .json({ success: false, message: "Not authorized" });
      }

      const course = await Course.findById(lesson.course_id._id);
      course.lessons = course.lessons.filter(
        (id) => id.toString() !== lesson._id.toString()
      );
      await course.save();
      await Lesson.findByIdAndDelete(lesson._id);

      res.json({ success: true, message: "Lesson deleted successfully" });
    } catch (error) {
      console.error("Error deleting lesson:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// GET next lesson
router.get("/:id/next", async (req, res) => {
  try {
    const current = await Lesson.findById(req.params.id);
    if (!current)
      return res
        .status(404)
        .json({ success: false, message: "Lesson not found" });

    const next = await Lesson.findOne({
      course_id: current.course_id,
      order: { $gt: current.order },
    }).sort({ order: 1 });

    if (!next)
      return res
        .status(404)
        .json({ success: false, message: "No next lesson found" });

    res.json({ success: true, data: next });
  } catch (error) {
    console.error("Error fetching next lesson:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET previous lesson
router.get("/:id/prev", async (req, res) => {
  try {
    const current = await Lesson.findById(req.params.id);
    if (!current)
      return res
        .status(404)
        .json({ success: false, message: "Lesson not found" });

    const prev = await Lesson.findOne({
      course_id: current.course_id,
      order: { $lt: current.order },
    }).sort({ order: -1 });

    if (!prev)
      return res
        .status(404)
        .json({ success: false, message: "No previous lesson found" });

    res.json({ success: true, data: prev });
  } catch (error) {
    console.error("Error fetching previous lesson:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
