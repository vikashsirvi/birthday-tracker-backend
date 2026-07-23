const nodemailer = require('nodemailer');
const EmailLog = require('../models/EmailLog');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async ({ to, subject, html, type = 'other', userId = null }) => {
  try {
    await transporter.sendMail({
      from: `"Birthday Tracker" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    await EmailLog.create({ to, subject, type, status: 'sent', userId });

    return true;
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);

    await EmailLog.create({
      to,
      subject,
      type,
      status: 'failed',
      error: error.message,
      userId,
    });

    throw new Error('Failed to send email');
  }
};

module.exports = sendEmail;