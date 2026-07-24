const nodemailer = require('nodemailer');
const EmailLog = require('../models/EmailLog');

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.error(
    '❌ EMAIL_USER and/or EMAIL_PASS environment variables are not configured. ' +
    'Emails will fail to send. Set them in Render Dashboard → Environment Variables.'
  );
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async ({ to, subject, html, type = 'other', userId = null }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    const configError = 'Email service is not configured. Please set EMAIL_USER and EMAIL_PASS environment variables.';
    console.error('❌', configError);

    await EmailLog.create({
      to,
      subject,
      type,
      status: 'failed',
      error: configError,
      userId,
    });

    throw new Error(configError);
  }

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

    const friendlyMessage = error.message.includes('Invalid login')
      ? 'Email service authentication failed. Check that EMAIL_PASS is a valid Gmail App Password (not your regular password).'
      : 'Failed to send email. Please try again later.';

    throw new Error(friendlyMessage);
  }
};

module.exports = sendEmail;