const express = require('express');
const router = express.Router();

const {
  register,
  verifyOtp,
  resendOtp,
  login,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
} = require('../controllers/authController');

const {
  registerValidator,
  loginValidator,
  otpValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
} = require('../validators/authValidator');

const { otpRateLimiter, loginRateLimiter } = require('../middleware/rateLimiter');

router.post('/register', registerValidator, register);
router.post('/verify-otp', otpValidator, verifyOtp);
router.post('/resend-otp', otpRateLimiter, resendOtp);
router.post('/login', loginRateLimiter, loginValidator, login);
router.post('/forgot-password', otpRateLimiter, forgotPasswordValidator, forgotPassword);
router.post('/verify-reset-otp', otpValidator, verifyResetOtp);
router.post('/reset-password', resetPasswordValidator, resetPassword);

module.exports = router;