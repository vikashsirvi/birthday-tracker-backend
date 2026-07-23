const bcrypt = require('bcryptjs');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const { passwordUpdatedTemplate } = require('../utils/emailTemplates');

const updateProfile = async (req, res) => {
  try {
    const { name, phone, avatar } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.name = name ?? user.name;
    user.phone = phone ?? user.phone;
    user.avatar = avatar ?? user.avatar;
    await user.save();

    res.status(200).json({
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to update profile' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }

    const user = await User.findById(req.user._id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    await sendEmail({
      to: user.email,
      subject: 'Password Changed Successfully - Birthday Tracker',
      html: passwordUpdatedTemplate(user.name),
      type: 'password-reset',
      userId: user._id,
    });

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to change password' });
  }
};

// 🔄 UPDATED — now handles whatsappReminders, and warns if enabling without a phone number
const updateNotificationPrefs = async (req, res) => {
  try {
    const { emailReminders, whatsappReminders, reminderTiming, weeklyDigest } = req.body;
    const user = await User.findById(req.user._id);

    if (whatsappReminders && !user.phone) {
      return res.status(400).json({ message: 'Please add a phone number in your profile before enabling WhatsApp reminders' });
    }

    user.notificationPrefs = {
      emailReminders: emailReminders ?? user.notificationPrefs.emailReminders,
      whatsappReminders: whatsappReminders ?? user.notificationPrefs.whatsappReminders,
      reminderTiming: reminderTiming ?? user.notificationPrefs.reminderTiming,
      weeklyDigest: weeklyDigest ?? user.notificationPrefs.weeklyDigest,
    };
    await user.save();

    res.status(200).json(user.notificationPrefs);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to update preferences' });
  }
};

const getNotifications = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const recent = user.notificationHistory.slice(-5).reverse();
    const history = user.notificationHistory.slice().reverse();

    res.status(200).json({
      notifications: recent,
      notificationHistory: history,
      streak: user.streak || 0,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch notifications' });
  }
};

module.exports = { updateProfile, changePassword, updateNotificationPrefs, getNotifications };