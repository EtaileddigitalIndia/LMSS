const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticateToken, requireInstructor, requireAdmin } = require('../middleware/auth');
const Lesson = require('../models/Lesson');
const Course = require('../models/Course');

// ⚙️ Enhanced Multer setup for lesson files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'video') {
      cb(null, "uploads/videos/");
    } else if (file.fieldname === 'attachments') {
      cb(null, "uploads/lesson-attachments/");
    } else {
      cb(null, "uploads/lessons/");
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'video') {
    // Only allow video files
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'), false);
    }
  } else {
    // Allow various file types for attachments
    cb(null, true);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for videos
  }
});

// Helper function to extract YouTube/Vimeo video ID
const extractVideoId = (url, platform) => {
  if (platform === 'youtube') {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? match[1] : null;
  } else if (platform === 'vimeo') {
    const match = url.match(/vimeo\.com\/(\d+)/);
    return match ? match[1] : null;
  }
  return null;
};

// GET all lessons for a course with enhanced data
router.get('/course/:courseId', async (req, res) => {
  try {
    const { includeContent = false } = req.query;
    
    let selectFields = '-__v';
    if (!includeContent) {
      selectFields += ' -content'; // Exclude heavy content for list views
    }

    const lessons = await Lesson.find({ course_id: req.params.courseId })
      .sort({ order: 1 })
      .populate('quiz', 'title questions.length passing_score time_limit')
      .select(selectFields);

    // Calculate total course duration
    const totalDuration = lessons.reduce((sum, lesson) => sum + (lesson.duration || 0), 0);

    res.json({
      success: true,
      data: {
        lessons,
        totalLessons: lessons.length,
        totalDuration,
        estimatedHours: Math.round((totalDuration / 60) * 10) / 10
      }
    });
  } catch (error) {
    console.error('Error fetching lessons:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// GET lesson by ID with full content
router.get('/:id', async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id)
      .populate('course_id', 'title created_by status')
      .populate('quiz')
      .select('-__v');

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    // Get next and previous lessons
    const nextLesson = await lesson.getNextLesson();
    const previousLesson = await lesson.getPreviousLesson();

    res.json({
      success: true,
      data: {
        ...lesson.toObject(),
        navigation: {
          next: nextLesson ? { _id: nextLesson._id, title: nextLesson.title } : null,
          previous: previousLesson ? { _id: previousLesson._id, title: previousLesson.title } : null
        }
      }
    });
  } catch (error) {
    console.error('Error fetching lesson:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// CREATE a new lesson with enhanced content support
router.post('/', 
  authenticateToken, 
  requireInstructor, 
  upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'attachments', maxCount: 10 }
  ]),
  async (req, res) => {
    try {
      const {
        title,
        content,
        course_id,
        order,
        duration,
        video_embed_url,
        video_platform,
        description,
        is_free,
        resources,
        quiz,
        content_type,
        notes
      } = req.body;

      // Verify course and permissions
      const course = await Course.findById(course_id);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      if (course.created_by.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to add lessons to this course'
        });
      }

      // Handle video processing
      let videoData = {};
      if (req.files?.video?.[0]) {
        // Direct video upload
        videoData = {
          video_url: `/uploads/videos/${req.files.video[0].filename}`,
          video_platform: 'direct',
          video_duration: duration || 0
        };
      } else if (video_embed_url && video_platform) {
        // External video (YouTube/Vimeo)
        const videoId = extractVideoId(video_embed_url, video_platform);
        videoData = {
          video_embed_url,
          video_platform,
          video_id: videoId,
          video_duration: duration || 0
        };
      }

      // Handle attachments
      const attachments = req.files?.attachments?.map(file => ({
        filename: file.filename,
        original_name: file.originalname,
        url: `/uploads/lesson-attachments/${file.filename}`,
        size: file.size,
        type: file.mimetype
      })) || [];

      // Parse resources if provided as JSON string
      let parsedResources = [];
      if (resources) {
        try {
          parsedResources = JSON.parse(resources);
        } catch (e) {
          parsedResources = [];
        }
      }

      // Auto-assign order if not provided
      let lessonOrder = order;
      if (!lessonOrder) {
        const lastLesson = await Lesson.findOne({ course_id })
          .sort({ order: -1 })
          .select('order');
        lessonOrder = lastLesson ? lastLesson.order + 1 : 1;
      }

      const lesson = new Lesson({
        title,
        content,
        course_id,
        order: lessonOrder,
        duration: parseInt(duration) || 0,
        description,
        is_free: is_free === 'true',
        attachments,
        resources: parsedResources,
        quiz,
        content_type: content_type || 'text',
        notes,
        ...videoData
      });

      await lesson.save();

      // Add lesson to course and update course stats
      course.lessons.push(lesson._id);
      await course.calculateTotalDuration();

      const populatedLesson = await Lesson.findById(lesson._id)
        .populate('course_id', 'title')
        .populate('quiz', 'title questions.length');

      res.status(201).json({
        success: true,
        data: populatedLesson
      });
    } catch (error) {
      console.error('Error creating lesson:', error);
      
      // Handle unique constraint error
      if (error.code === 11000 && error.keyPattern?.order) {
        return res.status(400).json({
          success: false,
          message: 'Lesson order must be unique within the course'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }
);

// UPDATE lesson with enhanced content support
router.put('/:id', 
  authenticateToken, 
  requireInstructor,
  upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'attachments', maxCount: 10 }
  ]),
  async (req, res) => {
    try {
      const lesson = await Lesson.findById(req.params.id).populate('course_id');

      if (!lesson) {
        return res.status(404).json({
          success: false,
          message: 'Lesson not found'
        });
      }

      // Check permission
      if (lesson.course_id.created_by.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this lesson'
        });
      }

      const {
        title,
        content,
        order,
        duration,
        video_embed_url,
        video_platform,
        description,
        is_free,
        resources,
        content_type,
        notes
      } = req.body;

      // Update basic fields
      if (title) lesson.title = title;
      if (content) lesson.content = content;
      if (description) lesson.description = description;
      if (duration) lesson.duration = parseInt(duration);
      if (is_free !== undefined) lesson.is_free = is_free === 'true';
      if (content_type) lesson.content_type = content_type;
      if (notes) lesson.notes = notes;

      // Handle order change
      if (order && parseInt(order) !== lesson.order) {
        // Check if new order conflicts
        const conflictingLesson = await Lesson.findOne({
          course_id: lesson.course_id._id,
          order: parseInt(order),
          _id: { $ne: lesson._id }
        });

        if (conflictingLesson) {
          return res.status(400).json({
            success: false,
            message: 'Order already exists for another lesson'
          });
        }

        lesson.order = parseInt(order);
      }

      // Handle video updates
      if (req.files?.video?.[0]) {
        // New video upload
        lesson.video_url = `/uploads/videos/${req.files.video[0].filename}`;
        lesson.video_platform = 'direct';
        lesson.video_embed_url = undefined;
        lesson.video_id = undefined;
      } else if (video_embed_url && video_platform) {
        // External video update
        const videoId = extractVideoId(video_embed_url, video_platform);
        lesson.video_embed_url = video_embed_url;
        lesson.video_platform = video_platform;
        lesson.video_id = videoId;
        lesson.video_url = undefined;
      }

      // Handle new attachments
      if (req.files?.attachments) {
        const newAttachments = req.files.attachments.map(file => ({
          filename: file.filename,
          original_name: file.originalname,
          url: `/uploads/lesson-attachments/${file.filename}`,
          size: file.size,
          type: file.mimetype
        }));
        lesson.attachments = [...(lesson.attachments || []), ...newAttachments];
      }

      // Update resources
      if (resources) {
        try {
          lesson.resources = JSON.parse(resources);
        } catch (e) {
          // Keep existing resources if parsing fails
        }
      }

      await lesson.save();

      // Update course duration
      await lesson.course_id.calculateTotalDuration();

      const updatedLesson = await Lesson.findById(lesson._id)
        .populate('course_id', 'title')
        .populate('quiz', 'title questions.length');

      res.json({
        success: true,
        data: updatedLesson
      });
    } catch (error) {
      console.error('Error updating lesson:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }
);

// BULK UPDATE lesson orders (for drag-and-drop reordering)
router.put('/course/:courseId/reorder', authenticateToken, requireInstructor, async (req, res) => {
  try {
    const { lessonOrders } = req.body; // Array of { lessonId, order }

    if (!Array.isArray(lessonOrders)) {
      return res.status(400).json({
        success: false,
        message: 'lessonOrders must be an array'
      });
    }

    // Verify course ownership
    const course = await Course.findById(req.params.courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (course.created_by.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Update lesson orders in batch
    const updatePromises = lessonOrders.map(({ lessonId, order }) =>
      Lesson.findByIdAndUpdate(lessonId, { order: parseInt(order) })
    );

    await Promise.all(updatePromises);

    // Fetch updated lessons
    const updatedLessons = await Lesson.find({ course_id: req.params.courseId })
      .sort({ order: 1 })
      .select('_id title order duration');

    res.json({
      success: true,
      message: 'Lesson order updated successfully',
      data: updatedLessons
    });
  } catch (error) {
    console.error('Error reordering lessons:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// DELETE lesson attachment
router.delete('/:id/attachments/:attachmentId', authenticateToken, requireInstructor, async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id).populate('course_id');

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    // Check permission
    if (lesson.course_id.created_by.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    lesson.attachments = lesson.attachments.filter(
      attachment => attachment._id.toString() !== req.params.attachmentId
    );

    await lesson.save();

    res.json({
      success: true,
      message: 'Attachment deleted successfully',
      data: lesson
    });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// DELETE lesson
router.delete('/:id', authenticateToken, requireInstructor, async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id).populate('course_id');

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    // Check permission
    if (lesson.course_id.created_by.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this lesson'
      });
    }

    const courseId = lesson.course_id._id;

    // Remove lesson from course
    const course = await Course.findById(courseId);
    course.lessons = course.lessons.filter(l => l.toString() !== lesson._id.toString());
    await course.save();

    // Delete the lesson
    await lesson.deleteOne();

    // Update course duration and stats
    await course.calculateTotalDuration();

    res.json({
      success: true,
      message: 'Lesson deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting lesson:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
