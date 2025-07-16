const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255
  },
  description: {
    type: String,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  content_type: {
    type: String,
    enum: ['text', 'video', 'mixed', 'quiz', 'assignment'],
    default: 'text'
  },
  order: {
    type: Number,
    required: true,
    min: 1
  },
  duration: {
    type: Number, // in minutes
    min: 0,
    default: 0
  },
  course_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  
  // Video integration
  video_url: {
    type: String, // For direct uploads
    trim: true
  },
  video_embed_url: {
    type: String, // For YouTube/Vimeo
    trim: true
  },
  video_platform: {
    type: String,
    enum: ['youtube', 'vimeo', 'direct'],
    default: 'direct'
  },
  video_id: {
    type: String, // Extracted video ID for YouTube/Vimeo
    trim: true
  },
  video_duration: {
    type: Number, // Video duration in seconds
    min: 0
  },
  
  // File attachments and resources
  attachments: [{
    filename: String,
    original_name: String,
    url: String,
    size: Number,
    type: String,
    description: String,
    uploaded_at: { type: Date, default: Date.now }
  }],
  
  resources: [{
    title: String,
    url: String,
    description: String,
    type: { type: String, enum: ['link', 'file', 'document'] }
  }],
  
  // Lesson settings
  is_free: {
    type: Boolean,
    default: false
  },
  
  is_preview: {
    type: Boolean,
    default: false
  },
  
  // Quiz integration
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz'
  },
  
  // Additional content
  notes: {
    type: String,
    trim: true
  },
  
  learning_objectives: [String],
  
  // Lesson completion tracking
  completion_criteria: {
    watch_percentage: { type: Number, min: 0, max: 100, default: 80 },
    requires_quiz: { type: Boolean, default: false },
    min_time_spent: { type: Number, default: 0 } // in seconds
  },
  
  // Metadata
  metadata: {
    views: { type: Number, default: 0 },
    avg_completion_time: { type: Number, default: 0 },
    completion_rate: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
lessonSchema.index({ course_id: 1, order: 1 });
lessonSchema.index({ course_id: 1 });
lessonSchema.index({ is_free: 1 });
lessonSchema.index({ content_type: 1 });

// Compound unique index to ensure order is unique within a course
lessonSchema.index({ course_id: 1, order: 1 }, { unique: true });

// Virtual for lesson URL
lessonSchema.virtual('url').get(function() {
  return `/courses/${this.course_id}/lessons/${this._id}`;
});

// Virtual for formatted duration
lessonSchema.virtual('formattedDuration').get(function() {
  if (!this.duration) return 'N/A';
  const hours = Math.floor(this.duration / 60);
  const minutes = this.duration % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
});

// Virtual for video embed code
lessonSchema.virtual('videoEmbedCode').get(function() {
  if (!this.video_embed_url) return null;
  
  if (this.video_platform === 'youtube' && this.video_id) {
    return `<iframe width="560" height="315" src="https://www.youtube.com/embed/${this.video_id}" frameborder="0" allowfullscreen></iframe>`;
  } else if (this.video_platform === 'vimeo' && this.video_id) {
    return `<iframe src="https://player.vimeo.com/video/${this.video_id}" width="560" height="315" frameborder="0" allowfullscreen></iframe>`;
  }
  
  return null;
});

// Virtual for lesson status
lessonSchema.virtual('isPublished').get(function() {
  return this.course_id && this.course_id.status === 'published';
});

// Virtual for content preview
lessonSchema.virtual('contentPreview').get(function() {
  if (!this.content) return '';
  return this.content.substring(0, 200) + (this.content.length > 200 ? '...' : '');
});

// Method to get next lesson
lessonSchema.methods.getNextLesson = async function() {
  return this.model('Lesson').findOne({
    course_id: this.course_id,
    order: { $gt: this.order }
  }).sort({ order: 1 });
};

// Method to get previous lesson
lessonSchema.methods.getPreviousLesson = async function() {
  return this.model('Lesson').findOne({
    course_id: this.course_id,
    order: { $lt: this.order }
  }).sort({ order: -1 });
};

// Method to add attachment
lessonSchema.methods.addAttachment = function(attachmentData) {
  this.attachments.push({
    ...attachmentData,
    uploaded_at: new Date()
  });
  return this.save();
};

// Method to remove attachment
lessonSchema.methods.removeAttachment = function(attachmentId) {
  this.attachments = this.attachments.filter(
    attachment => attachment._id.toString() !== attachmentId.toString()
  );
  return this.save();
};

// Method to add resource
lessonSchema.methods.addResource = function(resourceData) {
  this.resources.push(resourceData);
  return this.save();
};

// Method to update video metadata
lessonSchema.methods.updateVideoMetadata = function(videoData) {
  if (videoData.platform === 'direct') {
    this.video_url = videoData.url;
    this.video_platform = 'direct';
    this.video_embed_url = undefined;
    this.video_id = undefined;
  } else {
    this.video_embed_url = videoData.url;
    this.video_platform = videoData.platform;
    this.video_id = videoData.videoId;
    this.video_url = undefined;
  }
  
  if (videoData.duration) {
    this.video_duration = videoData.duration;
  }
  
  return this.save();
};

// Method to update metadata
lessonSchema.methods.incrementViews = function() {
  this.metadata.views += 1;
  return this.save();
};

// Method to calculate completion rate
lessonSchema.methods.updateCompletionRate = async function() {
  const Enrollment = mongoose.model('Enrollment');
  const totalEnrollments = await Enrollment.countDocuments({ course_id: this.course_id });
  
  if (totalEnrollments === 0) {
    this.metadata.completion_rate = 0;
    return this.save();
  }
  
  const completedCount = await Enrollment.countDocuments({
    course_id: this.course_id,
    'progress.completed_lessons': this._id
  });
  
  this.metadata.completion_rate = Math.round((completedCount / totalEnrollments) * 100);
  return this.save();
};

// Static method to find lessons by course
lessonSchema.statics.findByCourse = function(courseId, options = {}) {
  let query = this.find({ course_id: courseId });
  
  if (options.includeContent === false) {
    query = query.select('-content');
  }
  
  return query.sort({ order: 1 });
};

// Static method to get lesson count for a course
lessonSchema.statics.getLessonCount = function(courseId) {
  return this.countDocuments({ course_id: courseId });
};

// Static method to get total duration for a course
lessonSchema.statics.getTotalDuration = async function(courseId) {
  const result = await this.aggregate([
    { $match: { course_id: new mongoose.Types.ObjectId(courseId) } },
    { $group: { _id: null, totalDuration: { $sum: '$duration' } } }
  ]);
  
  return result.length > 0 ? result[0].totalDuration : 0;
};

// Static method to find free lessons
lessonSchema.statics.findFreeLessons = function(courseId) {
  return this.find({ course_id: courseId, is_free: true }).sort({ order: 1 });
};

// Static method to reorder lessons
lessonSchema.statics.reorderLessons = async function(courseId, lessonOrders) {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    for (const { lessonId, order } of lessonOrders) {
      await this.findByIdAndUpdate(lessonId, { order }, { session });
    }
    
    await session.commitTransaction();
    return true;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// Pre-save middleware to validate order and update course
lessonSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('order')) {
    const existingLesson = await this.model('Lesson').findOne({
      course_id: this.course_id,
      order: this.order,
      _id: { $ne: this._id }
    });
    
    if (existingLesson) {
      const error = new Error('Lesson order must be unique within a course');
      return next(error);
    }
  }
  
  // Update course's total lessons and duration
  if (this.isNew) {
    const Course = mongoose.model('Course');
    const course = await Course.findById(this.course_id);
    if (course && !course.lessons.includes(this._id)) {
      course.lessons.push(this._id);
      await course.save();
    }
  }
  
  next();
});

// Pre-remove middleware to update course
lessonSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  const Course = mongoose.model('Course');
  const course = await Course.findById(this.course_id);
  if (course) {
    course.lessons = course.lessons.filter(lessonId => lessonId.toString() !== this._id.toString());
    await course.save();
    await course.calculateTotalDuration();
  }
  next();
});

module.exports = mongoose.model('Lesson', lessonSchema); 