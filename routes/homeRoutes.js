const express = require('express');
const router = express.Router();

const { getStats, getTestimonials } = require('../controllers/homeController');

// Public routes — no auth needed
router.get('/stats', getStats);
router.get('/testimonials', getTestimonials);

module.exports = router;