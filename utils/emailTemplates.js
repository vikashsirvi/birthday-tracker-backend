const baseWrapper = (content) => `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #F9FAFC; padding: 40px 20px;">
    <div style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(45,49,66,0.08);">
      <div style="background: linear-gradient(120deg, #4F6EF7, #3D5AE0); padding: 24px 32px;">
        <h2 style="color: #ffffff; margin: 0; font-size: 20px;">🎂 Birthday Tracker</h2>
      </div>
      <div style="padding: 32px;">
        ${content}
      </div>
      <div style="padding: 20px 32px; background-color: #F1F3F9; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #9CA0B3;">© ${new Date().getFullYear()} Birthday Tracker. All rights reserved.</p>
      </div>
    </div>
  </div>
`;

const otpEmailTemplate = (otp, purpose) => {
  const heading = purpose === 'register' ? 'Verify Your Email' : 'Reset Your Password';
  const message =
    purpose === 'register'
      ? 'Use the OTP below to verify your email and complete your registration.'
      : 'Use the OTP below to reset your password.';

  return baseWrapper(`
    <h3 style="color: #2D3142; margin-top: 0;">${heading}</h3>
    <p style="color: #6B7280; font-size: 14.5px;">${message}</p>
    <div style="text-align: center; margin: 28px 0;">
      <span style="display: inline-block; background-color: #EDF0FE; color: #4F6EF7; font-size: 28px; font-weight: 700; letter-spacing: 6px; padding: 14px 28px; border-radius: 8px;">${otp}</span>
    </div>
    <p style="color: #6B7280; font-size: 13.5px;">This OTP is valid for <strong>5 minutes</strong>. Please do not share it with anyone.</p>
    <p style="color: #9CA0B3; font-size: 12.5px;">If you didn't request this, you can safely ignore this email.</p>
  `);
};

const welcomeEmailTemplate = (name) => {
  return baseWrapper(`
    <h3 style="color: #2D3142; margin-top: 0;">Registration Successful 🎉</h3>
    <p style="color: #6B7280; font-size: 14.5px;">Hi ${name},</p>
    <p style="color: #6B7280; font-size: 14.5px;">Your account has been registered successfully. You can now log in and start tracking birthdays of your friends and family.</p>
    <div style="text-align: center; margin: 28px 0;">
      <span style="display: inline-block; background-color: #4CAF93; color: #ffffff; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 8px;">Welcome Aboard!</span>
    </div>
  `);
};

const passwordUpdatedTemplate = (name) => {
  return baseWrapper(`
    <h3 style="color: #2D3142; margin-top: 0;">Password Updated Successfully ✅</h3>
    <p style="color: #6B7280; font-size: 14.5px;">Hi ${name || 'there'},</p>
    <p style="color: #6B7280; font-size: 14.5px;">Your account password has been changed successfully. If you did not perform this action, please contact support immediately.</p>
  `);
};

const broadcastAnnouncementTemplate = (message) => {
  return baseWrapper(`
    <h3 style="color: #2D3142; margin-top: 0;">📢 Announcement</h3>
    <p style="color: #6B7280; font-size: 14.5px; white-space: pre-line;">${message}</p>
  `);
};

module.exports = {
  otpEmailTemplate,
  welcomeEmailTemplate,
  passwordUpdatedTemplate,
  broadcastAnnouncementTemplate,
};