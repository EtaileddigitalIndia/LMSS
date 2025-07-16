const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 255 },
  description: { type: String, required: true, trim: true },
  short_description: { type: String, trim: true, maxlength: 500 },
  thumbnail_url: { type: String, default: null },
  price: { type: Number, required: true, min: 0, default: 0 },
  original_price: { type: Number, min: 0 }, // For discounts
  category: { type: String, required: true, trim: true, maxlength: 100 },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
  tags: [{ type: String, trim: true }],
  lessons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' }],
  enrolled_students_count: { type: Number, default: 0 },
  average_rating: { type: Number, default: 0, min: 0, max: 5 },
  total_ratings: { type: Number, default: 0 },
  total_lessons: { type: Number, default: 0 },
  duration: { type: Number, default: 0 }, // in minutes
  featured: { type: Boolean, default: false },
  certificate_template: { type: String, default: null },
  
  // Enhanced content structure
  learning_objectives: [{ type: String, trim: true }],
  prerequisites: [{ type: String, trim: true }],
  target_audience: [{ type: String, trim: true }],
  
  // Course content and resources
  resources: [{
    filename: String,
    original_name: String,
    url: String,
    size: Number,
    type: String,
    description: String,
    uploaded_at: { type: Date, default: Date.now }
  }],
  
  // Video integration
  intro_video: {
    type: String, // URL for intro video
    platform: { type: String, enum: ['youtube', 'vimeo', 'direct'], default: 'direct' },
    video_id: String // For YouTube/Vimeo
  },
  
  // Course settings
  settings: {
    allow_preview: { type: Boolean, default: true },
    drip_content: { type: Boolean, default: false },
    certificate_enabled: { type: Boolean, default: true },
    discussion_enabled: { type: Boolean, default: true },
    downloadable_resources: { type: Boolean, default: true }
  },
  
  // SEO and metadata
  seo: {
    meta_title: String,
    meta_description: String,
    keywords: [String]
  },
  
  // Course statistics
  stats: {
    total_views: { type: Number, default: 0 },
    total_enrollments: { type: Number, default: 0 },
    completion_rate: { type: Number, default: 0 },
    last_updated: { type: Date, default: Date.now }
  }
}, { timestamps: true });

// Indexes for better query performance
courseSchema.index({ created_by: 1, status: 1, category: 1, difficulty: 1, featured: 1, 'tags': 1 });
courseSchema.index({ title: 'text', description: 'text', tags: 'text' });
courseSchema.index({ price: 1 });
courseSchema.index({ average_rating: -1 });
courseSchema.index({ 'stats.total_enrollments': -1 });

// Virtual for course URL
courseSchema.virtual('url').get(function () {
  return `/courses/${this._id}`;
});

// Virtual for formatted price
courseSchema.virtual('formattedPrice').get(function () {
  return `$${this.price.toFixed(2)}`;
});

// Virtual for duration in hours
courseSchema.virtual('durationHours').get(function () {
  return Math.round((this.duration / 60) * 10) / 10;
});

// Virtual for discount percentage
courseSchema.virtual('discountPercentage').get(function () {
  if (this.original_price && this.original_price > this.price) {
    return Math.round(((this.original_price - this.price) / this.original_price) * 100);
  }
  return 0;
});

// Virtual for enrollment status
courseSchema.virtual('isPublished').get(function () {
  return this.status === 'published';
});

// Method to update enrolled student count
courseSchema.methods.updateEnrolledCount = async function () {
  const Enrollment = mongoose.model('Enrollment');
  const count = await Enrollment.countDocuments({ course_id: this._id, status: 'active' });
  this.enrolled_students_count = count;
  this.stats.total_enrollments = count;
  return this.save();
};

// Method to update average rating
courseSchema.methods.updateAverageRating = async function () {
  const Review = mongoose.model('Review');
  const result = await Review.aggregate([
    { $match: { course_id: this._id } },
    {
      $group: {
        _id: null,
        avgRating: { $avg: '$rating' },
        totalRatings: { $sum: 1 }
      }
    }
  ]);

  if (result.length > 0) {
    this.average_rating = Math.round(result[0].avgRating * 10) / 10;
    this.total_ratings = result[0].totalRatings;
  } else {
    this.average_rating = 0;
    this.total_ratings = 0;
  }

  return this.save();
};

// Method to calculate total duration
courseSchema.methods.calculateTotalDuration = async function () {
  const lessons = await mongoose.model('Lesson').find({ course_id: this._id });
  const totalDuration = lessons.reduce((sum, lesson) => sum + (lesson.duration || 0), 0);
  this.duration = totalDuration;
  this.total_lessons = lessons.length;
  return this.save();
};

// Method to update course statistics
courseSchema.methods.updateStats = async function () {
  const Enrollment = mongoose.model('Enrollment');
  const completedEnrollments = await Enrollment.countDocuments({ 
    course_id: this._id, 
    status: 'completed' 
  });
  const totalEnrollments = await Enrollment.countDocuments({ course_id: this._id });
  
  this.stats.completion_rate = totalEnrollments > 0 ? 
    Math.round((completedEnrollments / totalEnrollments) * 100) : 0;
  this.stats.last_updated = new Date();
  
  return this.save();
};

// Method to add resource
courseSchema.methods.addResource = function (resourceData) {
  this.resources.push({
    ...resourceData,
    uploaded_at: new Date()
  });
  return this.save();
};

// Method to remove resource
courseSchema.methods.removeResource = function (resourceId) {
  this.resources = this.resources.filter(
    resource => resource._id.toString() !== resourceId.toString()
  );
  return this.save();
};

// Static method to find published courses
courseSchema.statics.findPublished = function () {
  return this.find({ status: 'published' });
};

// Static method to find by instructor
courseSchema.statics.findByInstructor = function (instructorId) {
  return this.find({ created_by: instructorId });
};

// Static method to find featured courses
courseSchema.statics.findFeatured = function () {
  return this.find({ featured: true, status: 'published' });
};

// Static method to search courses
courseSchema.statics.searchCourses = function (searchTerm, options = {}) {
  const query = {
    $or: [
      { title: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { tags: { $in: [new RegExp(searchTerm, 'i')] } }
    ],
    status: 'published'
  };
  
  return this.find(query)
    .populate('created_by', 'full_name')
    .sort(options.sort || { createdAt: -1 })
    .limit(options.limit || 20);
};

// Pre-save middleware to update lesson count and duration
courseSchema.pre('save', async function (next) {
  if (this.lessons && this.lessons.length > 0) {
    this.total_lessons = this.lessons.length;
  }
  
  // Update last_updated timestamp
  this.stats.last_updated = new Date();
  
  next();
});

// Pre-remove middleware to clean up related data
courseSchema.pre('remove', async function (next) {
  // Remove all lessons
  await mongoose.model('Lesson').deleteMany({ course_id: this._id });
  
  // Remove all enrollments
  await mongoose.model('Enrollment').deleteMany({ course_id: this._id });
  
  // Remove all certificates
  await mongoose.model('Certificate').deleteMany({ course_id: this._id });
  
  next();
});

module.exports = mongoose.model('Course', courseSchema);
