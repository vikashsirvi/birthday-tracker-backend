const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Otp = require('../models/Otp');
const PlatformSettings = require('../models/PlatformSettings');
const generateOtp = require('../utils/generateOtp');
const generateToken = require('../utils/generateToken');
const sendEmail = require('../utils/sendEmail');
const {
  otpEmailTemplate,
  welcomeEmailTemplate,
  passwordUpdatedTemplate,
} = require('../utils/emailTemplates');

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ message: errors.array()[0].msg });
    return false;
  }
  return true;
};

// @desc Register new user + send OTP
// @route POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  if (!handleValidation(req, res)) return;

  const { name, email, password } = req.body;

  const settings = await PlatformSettings.findOne();
  if (settings?.maintenanceMode) {
    res.status(503);
    throw new Error('Platform is currently under maintenance. Please try again later.');
  }
  if (settings && settings.allowRegistration === false) {
    res.status(403);
    throw new Error('New registrations are currently disabled.');
  }

  const existingUser = await User.findOne({ email });
  if (existingUser && existingUser.isVerified) {
    res.status(400);
    throw new Error('Email is already registered');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  if (existingUser && !existingUser.isVerified) {
    existingUser.name = name;
    existingUser.password = hashedPassword;
    await existingUser.save();
  } else {
    await User.create({ name, email, password: hashedPassword });
  }

  await Otp.deleteMany({ email, purpose: 'register' });
  const otp = generateOtp();
  await Otp.create({ email, otp, purpose: 'register' });

  await sendEmail({
    to: email,
    subject: 'Verify Your Email - Birthday Tracker',
    html: otpEmailTemplate(otp, 'register'),
    type: 'otp',
  });

  res.status(200).json({ message: 'OTP sent to your email successfully', email });
});

// @desc Verify OTP for registration
// @route POST /api/auth/verify-otp
const verifyOtp = asyncHandler(async (req, res) => {
  if (!handleValidation(req, res)) return;

  const { email, otp } = req.body;

  const otpRecord = await Otp.findOne({ email, otp, purpose: 'register' });
  if (!otpRecord) {
    res.status(400);
    throw new Error('Invalid or expired OTP');
  }

  const user = await User.findOne({ email });
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.isVerified = true;
  await user.save();

  await Otp.deleteMany({ email, purpose: 'register' });

  await sendEmail({
    to: email,
    subject: 'Registration Successful - Birthday Tracker',
    html: welcomeEmailTemplate(user.name),
    type: 'welcome',
    userId: user._id,
  });

  res.status(200).json({ message: 'Email verified successfully. Registration complete!' });
});

// @desc Resend OTP (register or forgot-password)
// @route POST /api/auth/resend-otp
const resendOtp = asyncHandler(async (req, res) => {
  const { email, type } = req.body;

  if (!email || !type) {
    res.status(400);
    throw new Error('Email and type are required');
  }

  const purpose = type === 'register' ? 'register' : 'forgot-password';

  const user = await User.findOne({ email });
  if (!user) {
    res.status(404);
    throw new Error('No account found with this email');
  }

  await Otp.deleteMany({ email, purpose });
  const otp = generateOtp();
  await Otp.create({ email, otp, purpose });

  await sendEmail({
    to: email,
    subject: 'Your New OTP - Birthday Tracker',
    html: otpEmailTemplate(otp, purpose),
    type: 'otp',
    userId: user._id,
  });

  res.status(200).json({ message: 'OTP resent successfully' });
});

// @desc Login (role-based - admin/user share same endpoint)
// @route POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  if (!handleValidation(req, res)) return;

  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    res.status(400);
    throw new Error('Invalid email or password');
  }

  // Allow admin to log in even during maintenance mode so they can disable it
  const settings = await PlatformSettings.findOne();
  if (settings?.maintenanceMode && user.role !== 'admin') {
    res.status(503);
    throw new Error('Platform is currently under maintenance. Please try again later.');
  }

  if (user.isSuspended) {
    res.status(403);
    throw new Error('Your account has been suspended. Please contact support.');
  }

  if (!user.isVerified) {
    res.status(403);
    throw new Error('Please verify your email before logging in');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    res.status(400);
    throw new Error('Invalid email or password');
  }

  const token = generateToken(user);

  res.status(200).json({
    message: 'Login successful',
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
    },
  });
});

// @desc Forgot Password - send OTP
// @route POST /api/auth/forgot-password
const forgotPassword = asyncHandler(async (req, res) => {
  if (!handleValidation(req, res)) return;

  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    res.status(404);
    throw new Error('No account found with this email');
  }

  // Always save OTP first so user can proceed even if email fails
  await Otp.deleteMany({ email, purpose: 'forgot-password' });
  const otp = generateOtp();
  await Otp.create({ email, otp, purpose: 'forgot-password' });

  // Try sending email, but don't fail the request if it errors out
  // The OTP is already saved and user can try the "Resend OTP" flow
  try {
    await sendEmail({
      to: email,
      subject: 'Reset Your Password - Birthday Tracker',
      html: otpEmailTemplate(otp, 'forgot-password'),
      type: 'otp',
      userId: user._id,
    });
  } catch (emailError) {
    console.error('⚠️ Forgot-password email failed to send, but OTP was saved:', emailError.message);
    // Log to activity for admin visibility
    try {
      const ActivityLog = require('../models/ActivityLog');
      await ActivityLog.create({
        user: user._id,
        action: 'forgot-password-email-failed',
        details: `Email delivery failed for ${email}: ${emailError.message}`,
      });
    } catch (logError) {
      console.error('⚠️ Failed to log email error to ActivityLog:', logError.message);
    }
  }

  // Always return success — OTP is saved, frontend navigates to OTP verify page
  res.status(200).json({ message: 'OTP sent to your email successfully', email });
});

// @desc Verify OTP for password reset -> issue short-lived resetToken
// @route POST /api/auth/verify-reset-otp
const verifyResetOtp = asyncHandler(async (req, res) => {
  if (!handleValidation(req, res)) return;

  const { email, otp } = req.body;

  const otpRecord = await Otp.findOne({ email, otp, purpose: 'forgot-password' });
  if (!otpRecord) {
    res.status(400);
    throw new Error('Invalid or expired OTP');
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  otpRecord.verified = true;
  otpRecord.resetToken = resetToken;
  await otpRecord.save();

  res.status(200).json({ message: 'OTP verified successfully', resetToken });
});

// @desc Reset Password (requires valid resetToken issued after OTP verification)
// @route POST /api/auth/reset-password
const resetPassword = asyncHandler(async (req, res) => {
  if (!handleValidation(req, res)) return;

  const { email, resetToken, password } = req.body;

  const otpRecord = await Otp.findOne({
    email,
    purpose: 'forgot-password',
    verified: true,
    resetToken,
  });

  if (!otpRecord) {
    res.status(400);
    throw new Error('Invalid or expired reset session. Please try again.');
  }

  const user = await User.findOne({ email });
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.password = await bcrypt.hash(password, 10);
  await user.save();

  await Otp.deleteMany({ email, purpose: 'forgot-password' });

  await sendEmail({
    to: email,
    subject: 'Password Updated Successfully - Birthday Tracker',
    html: passwordUpdatedTemplate(user.name),
    type: 'password-reset',
    userId: user._id,
  });

  res.status(200).json({ message: 'Password updated successfully' });
});

module.exports = {
  register,
  verifyOtp,
  resendOtp,
  login,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
};

