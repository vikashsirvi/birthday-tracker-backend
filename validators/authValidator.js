const { body } = require('express-validator');

const registerValidator = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  body('password')
    .matches(/^(?=.*[A-Z])(?=.*[0-9]).{8,}$/)
    .withMessage('Password must be at least 8 characters, include 1 uppercase letter & 1 number'),
];

const loginValidator = [
  body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const otpValidator = [
  body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
];

const forgotPasswordValidator = [
  body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
];

const resetPasswordValidator = [
  body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  body('resetToken').notEmpty().withMessage('Reset token is required'),
  body('password')
    .matches(/^(?=.*[A-Z])(?=.*[0-9]).{8,}$/)
    .withMessage('Password must be at least 8 characters, include 1 uppercase letter & 1 number'),
];

module.exports = {
  registerValidator,
  loginValidator,
  otpValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
};