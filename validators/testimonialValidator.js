const { body } = require('express-validator');

const testimonialValidator = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('message').trim().notEmpty().withMessage('Testimonial message is required'),
];

module.exports = { testimonialValidator };