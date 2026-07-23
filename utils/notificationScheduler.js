const cron = require('node-cron');
const User = require('../models/User');
const Birthday = require('../models/Birthday');
const sendEmail = require('./sendEmail');
const sendWhatsApp = require('./sendWhatsApp');
const { getDaysUntilBirthday } = require('./ageHelper');

const reminderTimingToDays = {
  'same-day': 0,
  '1-day': 1,
  '1-week': 7,
};

const startNotificationScheduler = () => {
  cron.schedule('0 7 * * *', async () => {
    console.log('⏰ Running daily birthday reminder job...');
    try {
      const users = await User.find({ isVerified: true });

      for (const user of users) {
        const wantsEmail = user.notificationPrefs?.emailReminders;
        const wantsWhatsApp = user.notificationPrefs?.whatsappReminders && user.phone;

        if (!wantsEmail && !wantsWhatsApp) continue;

        const birthdays = await Birthday.find({ userId: user._id });
        const reminderDays = reminderTimingToDays[user.notificationPrefs?.reminderTiming] ?? 1;

        const dueBirthdays = birthdays.filter((b) => getDaysUntilBirthday(b.dob) === reminderDays);

        for (const b of dueBirthdays) {
          const whenText = reminderDays === 0 ? 'today' : `in ${reminderDays} day(s)`;
          const message = `${b.name}'s birthday is ${whenText}!`;

          user.notificationHistory.push({ title: 'Birthday Reminder', message });

          if (wantsEmail) {
            try {
              await sendEmail({
                to: user.email,
                subject: `Reminder: ${b.name}'s Birthday`,
                html: `<div style="font-family:sans-serif;padding:20px;"><h3>🎂 ${message}</h3><p>Don't forget to wish ${b.name}!</p></div>`,
                type: 'reminder',
                userId: user._id,
              });
            } catch (err) {
              // already logged inside sendEmail
            }
          }

          if (wantsWhatsApp) {
            await sendWhatsApp({
              to: user.phone,
              message: `🎂 Reminder: ${message} Don't forget to wish ${b.name}!`,
            });
          }
        }

        if (dueBirthdays.length > 0) {
          await user.save();
        }
      }

      console.log('✅ Birthday reminder job completed');
    } catch (error) {
      console.error('❌ Notification scheduler error:', error.message);
    }
  });

  console.log('📅 Notification scheduler initialized (daily at 7:00 AM)');
};

module.exports = startNotificationScheduler;