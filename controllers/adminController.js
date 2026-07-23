const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const Birthday = require('../models/Birthday');
const Testimonial = require('../models/Testimonial');
const EmailLog = require('../models/EmailLog');
const ActivityLog = require('../models/ActivityLog');
const PlatformSettings = require('../models/PlatformSettings');
const sendEmail = require('../utils/sendEmail');
const { logActivity } = require('../utils/activityLogger');
const { getZodiacSign, calculateAge } = require('../utils/ageHelper');
const { otpEmailTemplate, broadcastAnnouncementTemplate } = require('../utils/emailTemplates');
const generateOtp = require('../utils/generateOtp');
const Otp = require('../models/Otp');

// ============ DASHBOARD OVERVIEW ============

// @desc Admin dashboard overview stats
// @route GET /api/admin/overview
const getOverview = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalBirthdays = await Birthday.countDocuments();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const newSignups = await User.countDocuments({ role: 'user', createdAt: { $gte: sevenDaysAgo } });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activeToday = await User.countDocuments({ role: 'user', updatedAt: { $gte: today } });

    const recentSignups = await User.find({ role: 'user' })
      .sort({ createdAt: -1 })
      .limit(6)
      .select('name email avatar isVerified createdAt');

    // User growth (last 6 months)
    const monthsBack = 6;
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const userGrowth = [];
    for (let i = monthsBack - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const count = await User.countDocuments({ role: 'user', createdAt: { $gte: start, $lt: end } });
      userGrowth.push({ month: monthNames[d.getMonth()], users: count });
    }

    // Health score
    const verifiedCount = await User.countDocuments({ role: 'user', isVerified: true });
    const verifiedRate = totalUsers > 0 ? Math.round((verifiedCount / totalUsers) * 100) : 0;

    const totalEmails = await EmailLog.countDocuments();
    const sentEmails = await EmailLog.countDocuments({ status: 'sent' });
    const emailRate = totalEmails > 0 ? Math.round((sentEmails / totalEmails) * 100) : 100;

    const avgBirthdays = totalUsers > 0 ? +(totalBirthdays / totalUsers).toFixed(1) : 0;

    const score = Math.round((verifiedRate * 0.4) + (emailRate * 0.4) + (Math.min(avgBirthdays * 10, 20)));

    // Pending items
    const unapprovedTestimonials = await Testimonial.countDocuments({ approved: false });
    const unverifiedUsers = await User.countDocuments({ role: 'user', isVerified: false });
    const flaggedUsers = await User.countDocuments({ role: 'user', isSuspended: true });

    // Silent users (registered 3+ days ago, 0 birthdays added)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const oldUsers = await User.find({ role: 'user', isVerified: true, createdAt: { $lte: threeDaysAgo } }).select('name avatar createdAt');
    const silentUsers = [];
    for (const u of oldUsers) {
      const count = await Birthday.countDocuments({ userId: u._id });
      if (count === 0) {
        const daysSinceJoin = Math.floor((Date.now() - new Date(u.createdAt)) / (1000 * 60 * 60 * 24));
        silentUsers.push({ _id: u._id, name: u.name, avatar: u.avatar, daysSinceJoin });
      }
    }

    // Anomaly alerts (basic heuristics)
    const anomalies = [];
    const emailDomainCounts = {};
    const allUsersForAnomaly = await User.find({ role: 'user' }).select('email createdAt');
    allUsersForAnomaly.forEach((u) => {
      const domain = u.email.split('@')[1];
      emailDomainCounts[domain] = (emailDomainCounts[domain] || 0) + 1;
    });
    Object.entries(emailDomainCounts).forEach(([domain, count]) => {
      if (count >= 5) {
        anomalies.push({
          title: 'Mass registration detected',
          description: `${count} accounts registered using @${domain}`,
        });
      }
    });

    const highVolumeUsers = await Birthday.aggregate([
      { $group: { _id: '$userId', count: { $sum: 1 } } },
      { $match: { count: { $gte: 50 } } },
    ]);
    if (highVolumeUsers.length > 0) {
      anomalies.push({
        title: 'Unusually high birthday-entry rate',
        description: `${highVolumeUsers.length} account(s) have added 50+ birthdays — possible bulk import or bot activity`,
      });
    }

    res.status(200).json({
      overview: { totalUsers, totalBirthdays, newSignups, activeToday },
      recentSignups,
      userGrowth,
      healthScore: { score, verifiedRate, emailRate, avgBirthdays },
      pending: { testimonials: unapprovedTestimonials, unverifiedUsers, flagged: flaggedUsers },
      anomalies,
      silentUsers,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch overview' });
  }
};

// ============ USER MANAGEMENT ============

// @desc Get all users with birthday counts
// @route GET /api/admin/users
const getUsers = async (req, res) => {
  try {
    const users = await User.find({ role: 'user' }).sort({ createdAt: -1 }).select('-password');

    const usersWithCounts = await Promise.all(
      users.map(async (u) => {
        const birthdayCount = await Birthday.countDocuments({ userId: u._id });
        return { ...u.toObject(), birthdayCount };
      })
    );

    res.status(200).json(usersWithCounts);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch users' });
  }
};

// @desc Suspend/Activate a user
// @route PATCH /api/admin/users/:id/suspend
const suspendUser = async (req, res) => {
  try {
    const { suspend } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isSuspended = !!suspend;
    user.suspendedAt = suspend ? new Date() : null;
    await user.save();

    await logActivity(req.user._id, req.user.name, suspend ? 'Suspended user' : 'Activated user', user.email);

    const birthdayCount = await Birthday.countDocuments({ userId: user._id });
    res.status(200).json({ ...user.toObject(), birthdayCount });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to update user status' });
  }
};

// @desc Manually verify a user
// @route PATCH /api/admin/users/:id/verify
const verifyUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isVerified = true;
    await user.save();

    await logActivity(req.user._id, req.user.name, 'Manually verified user', user.email);

    const birthdayCount = await Birthday.countDocuments({ userId: user._id });
    res.status(200).json({ ...user.toObject(), birthdayCount });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to verify user' });
  }
};

// @desc Delete a user
// @route DELETE /api/admin/users/:id
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await Birthday.deleteMany({ userId: user._id });

    await logActivity(req.user._id, req.user.name, 'Deleted user', user.email);

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to delete user' });
  }
};

// @desc Trigger password reset email on behalf of a user
// @route POST /api/admin/users/:id/reset-password
const resetUserPassword = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await Otp.deleteMany({ email: user.email, purpose: 'forgot-password' });
    const otp = generateOtp();
    await Otp.create({ email: user.email, otp, purpose: 'forgot-password' });

    await sendEmail({
      to: user.email,
      subject: 'Reset Your Password - Birthday Tracker',
      html: otpEmailTemplate(otp, 'forgot-password'),
      type: 'password-reset',
      userId: user._id,
    });

    await logActivity(req.user._id, req.user.name, 'Triggered password reset', user.email);

    res.status(200).json({ message: 'Password reset email sent to user' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to send reset email' });
  }
};

// ============ TESTIMONIALS ============

// @desc Get all testimonials (admin view - includes unapproved)
// @route GET /api/admin/testimonials
const getAdminTestimonials = async (req, res) => {
  try {
    const testimonials = await Testimonial.find().sort({ createdAt: -1 });
    res.status(200).json(testimonials);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch testimonials' });
  }
};

// @desc Add new testimonial
// @route POST /api/admin/testimonials
const addTestimonial = async (req, res) => {
  try {
    const { name, role, message, avatar } = req.body;
    const testimonial = await Testimonial.create({ name, role, message, avatar });

    await logActivity(req.user._id, req.user.name, 'Added testimonial', name);

    res.status(201).json(testimonial);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to add testimonial' });
  }
};

// @desc Update testimonial
// @route PUT /api/admin/testimonials/:id
const updateTestimonial = async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);
    if (!testimonial) return res.status(404).json({ message: 'Testimonial not found' });

    const { name, role, message, avatar } = req.body;
    testimonial.name = name ?? testimonial.name;
    testimonial.role = role ?? testimonial.role;
    testimonial.message = message ?? testimonial.message;
    testimonial.avatar = avatar ?? testimonial.avatar;
    await testimonial.save();

    await logActivity(req.user._id, req.user.name, 'Updated testimonial', testimonial.name);

    res.status(200).json(testimonial);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to update testimonial' });
  }
};

// @desc Delete testimonial
// @route DELETE /api/admin/testimonials/:id
const deleteTestimonial = async (req, res) => {
  try {
    const testimonial = await Testimonial.findByIdAndDelete(req.params.id);
    if (!testimonial) return res.status(404).json({ message: 'Testimonial not found' });

    await logActivity(req.user._id, req.user.name, 'Deleted testimonial', testimonial.name);

    res.status(200).json({ message: 'Testimonial deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to delete testimonial' });
  }
};

// @desc Toggle testimonial approval
// @route PATCH /api/admin/testimonials/:id/approval
const toggleTestimonialApproval = async (req, res) => {
  try {
    const { approved } = req.body;
    const testimonial = await Testimonial.findById(req.params.id);
    if (!testimonial) return res.status(404).json({ message: 'Testimonial not found' });

    testimonial.approved = !!approved;
    await testimonial.save();

    await logActivity(
      req.user._id,
      req.user.name,
      approved ? 'Approved testimonial' : 'Unapproved testimonial',
      testimonial.name
    );

    res.status(200).json(testimonial);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to update approval status' });
  }
};

// ============ ANALYTICS / REPORT ============

// @desc Platform-wide analytics report
// @route GET /api/admin/report
const getReport = async (req, res) => {
  try {
    const allBirthdays = await Birthday.find();

    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const perMonthMap = {};
    monthNames.forEach((m) => (perMonthMap[m] = 0));
    allBirthdays.forEach((b) => {
      const m = monthNames[new Date(b.dob).getMonth()];
      perMonthMap[m]++;
    });
    const birthdaysPerMonth = monthNames.map((m) => ({ month: m, count: perMonthMap[m] }));

    // User growth (reuse overview logic, last 6 months)
    const monthsBack = 6;
    const userGrowth = [];
    for (let i = monthsBack - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const count = await User.countDocuments({ role: 'user', createdAt: { $gte: start, $lt: end } });
      userGrowth.push({ month: monthNames[d.getMonth()], users: count });
    }

    const groupMap = {};
    allBirthdays.forEach((b) => {
      groupMap[b.group] = (groupMap[b.group] || 0) + 1;
    });
    const groupDistribution = Object.entries(groupMap).map(([group, count]) => ({ group, count }));

    const zodiacMap = {};
    allBirthdays.forEach((b) => {
      const sign = getZodiacSign(b.dob);
      zodiacMap[sign] = (zodiacMap[sign] || 0) + 1;
    });
    const zodiacDistribution = Object.entries(zodiacMap).map(([sign, count]) => ({ sign, count }));

    // Feature adoption
    const totalUsers = await User.countDocuments({ role: 'user' });
    const usersWithGroups = totalUsers > 0
      ? (await Birthday.distinct('userId')).length
      : 0;

    const Group = require('../models/Group');
    const Gift = require('../models/Gift');

    const usersWithCustomGroups = (await Group.distinct('userId')).length;
    const usersWithGifts = (await Gift.distinct('userId')).length;
    const usersWithMemories = await Birthday.countDocuments({ 'memories.0': { $exists: true } });

    const pct = (count) => (totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0);

    const featureAdoption = [
      { feature: 'Added at least 1 Birthday', percent: pct(usersWithGroups) },
      { feature: 'Custom Groups', percent: pct(usersWithCustomGroups) },
      { feature: 'Gift Tracker', percent: pct(usersWithGifts) },
      { feature: 'Memory Timeline', percent: pct(usersWithMemories) },
    ];

    // Cohort retention (simplified: % of users from N weeks ago still active this week)
    const cohortRetention = [];
    for (let w = 0; w < 4; w++) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (w + 1) * 7);
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - w * 7);

      const cohortUsers = await User.find({ role: 'user', createdAt: { $lt: weekEnd, $gte: weekStart } }).select('_id updatedAt');
      const activeInCohort = cohortUsers.filter((u) => new Date(u.updatedAt) >= weekStart).length;
      const retention = cohortUsers.length > 0 ? Math.round((activeInCohort / cohortUsers.length) * 100) : 0;

      cohortRetention.unshift({ week: `Week ${4 - w}`, retention });
    }

    res.status(200).json({
      report: { userGrowth, birthdaysPerMonth, groupDistribution, zodiacDistribution },
      featureAdoption,
      cohortRetention,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch report' });
  }
};

// ============ ALL BIRTHDAYS (PLATFORM VIEW) ============

// @desc Get all birthdays across all users (read-only)
// @route GET /api/admin/birthdays
const getAllBirthdays = async (req, res) => {
  try {
    const birthdays = await Birthday.find().populate('userId', 'name email').sort({ createdAt: -1 });

    const formatted = birthdays.map((b) => ({
      _id: b._id,
      name: b.name,
      dob: b.dob.toISOString().split('T')[0],
      group: b.group,
      ownerName: b.userId?.name || 'Unknown',
      ownerEmail: b.userId?.email || 'Unknown',
    }));

    res.status(200).json(formatted);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch birthdays' });
  }
};

// ============ EMAIL LOGS ============

// @desc Get email logs
// @route GET /api/admin/email-logs
const getEmailLogs = async (req, res) => {
  try {
    const logs = await EmailLog.find().sort({ createdAt: -1 }).limit(200);
    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch email logs' });
  }
};

// ============ ACTIVITY LOGS ============

// @desc Get activity/audit logs
// @route GET /api/admin/activity-logs
const getActivityLogs = async (req, res) => {
  try {
    const logs = await ActivityLog.find().sort({ createdAt: -1 }).limit(200);
    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch activity logs' });
  }
};

// ============ PLATFORM SETTINGS ============

// @desc Update platform settings
// @route PUT /api/admin/settings
const updatePlatformSettings = async (req, res) => {
  try {
    const { allowRegistration, maintenanceMode } = req.body;

    let settings = await PlatformSettings.findOne();
    if (!settings) {
      settings = await PlatformSettings.create({});
    }

    settings.allowRegistration = allowRegistration ?? settings.allowRegistration;
    settings.maintenanceMode = maintenanceMode ?? settings.maintenanceMode;
    await settings.save();

    await logActivity(req.user._id, req.user.name, 'Updated platform settings');

    res.status(200).json({
      allowRegistration: settings.allowRegistration,
      maintenanceMode: settings.maintenanceMode,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to update settings' });
  }
};

// ============ BROADCAST ============

// @desc Send broadcast announcement email to a user segment
// @route POST /api/admin/broadcast
const sendBroadcast = async (req, res) => {
  try {
    const { message, segment } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Announcement message is required' });
    }

    let query = { role: 'user' };
    if (segment === 'Verified Only') query.isVerified = true;
    if (segment === 'Unverified Only') query.isVerified = false;

    const targetUsers = await User.find(query).select('email');

    let sentCount = 0;
    for (const u of targetUsers) {
      try {
        await sendEmail({
          to: u.email,
          subject: 'Announcement - Birthday Tracker',
          html: broadcastAnnouncementTemplate(message),
          type: 'broadcast',
        });
        sentCount++;
      } catch (err) {
        // individual failures already logged in EmailLog by sendEmail()
      }
    }

    await logActivity(req.user._id, req.user.name, 'Sent broadcast announcement', `${segment} (${sentCount} sent)`);

    res.status(200).json({ message: `Announcement sent to ${sentCount} user(s)` });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to send broadcast' });
  }
};

module.exports = {
  getOverview,
  getUsers,
  suspendUser,
  verifyUser,
  deleteUser,
  resetUserPassword,
  getAdminTestimonials,
  addTestimonial,
  updateTestimonial,
  deleteTestimonial,
  toggleTestimonialApproval,
  getReport,
  getAllBirthdays,
  getEmailLogs,
  getActivityLogs,
  updatePlatformSettings,
  sendBroadcast,
};