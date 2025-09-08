const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, message: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.user_id);

    if (!user || !user.is_active) {
      return res.status(403).json({ success: false, message: 'Invalid or deactivated user' });
    }

    req.user = {
      _id: user._id,
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      full_name: user.full_name,
      is_active: user.is_active,
    };

    next();
  } catch (error) {
    const message =
      error.name === 'TokenExpiredError'
        ? 'Token expired'
        : error.name === 'JsonWebTokenError'
        ? 'Invalid token'
        : 'Authentication error';

    return res.status(401).json({ success: false, message });
  }
};

// Role-based authorization
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    next();
  };
};

// Specific role guards
const requireAdmin = authorizeRoles('admin');
const requireInstructor = authorizeRoles('instructor');
const requireAdminOrInstructor = authorizeRoles('admin', 'instructor');
const requireStudent = authorizeRoles('student', 'admin', 'instructor');
const requireParent = authorizeRoles('parent', 'admin');

module.exports = {
  authenticateToken,
  authorizeRoles,
  requireAdmin,
  requireInstructor,
  requireAdminOrInstructor,
  requireStudent,
  requireParent
};
