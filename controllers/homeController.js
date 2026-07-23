const User = require('../models/User');
const Birthday = require('../models/Birthday');
const Testimonial = require('../models/Testimonial');

// @desc Get platform-wide stats for home page
// @route GET /api/home/stats
const getStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalBirthdays = await Birthday.countDocuments();

    res.status(200).json({
      totalUsers,
      totalBirthdays,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch stats' });
  }
};

// @desc Get approved testimonials for home page (public)
// @route GET /api/home/testimonials
const getTestimonials = async (req, res) => {
  try {
    const testimonials = await Testimonial.find({ approved: true }).sort({ createdAt: -1 });
    res.status(200).json(testimonials);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch testimonials' });
  }
};

module.exports = { getStats, getTestimonials };