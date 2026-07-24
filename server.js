const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = require('./config/db');
const homeRoutes = require('./routes/homeRoutes');
const authRoutes = require('./routes/authRoutes');
const birthdayRoutes = require('./routes/birthdayRoutes');
const groupRoutes = require('./routes/groupRoutes');
const giftRoutes = require('./routes/giftRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const startNotificationScheduler = require('./utils/notificationScheduler');
const PlatformSettings = require('./models/PlatformSettings');

connectDB();

const ensurePlatformSettings = async () => {
  try {
    const existing = await PlatformSettings.findOne();
    if (!existing) {
      await PlatformSettings.create({});
      console.log('✅ Default platform settings created');
    }
  } catch (error) {
    console.error('❌ Failed to ensure platform settings:', error.message);
  }
};
ensurePlatformSettings();

const app = express();

app.use(cors({
  origin: [
    'https://birthday-tracker-frontend-coral.vercel.app',
    'http://localhost:3000',
  ],
  credentials: true,
}));
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send('Birthday Tracker API is running...');
});

app.use('/api/home', homeRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/birthdays', birthdayRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/gifts', giftRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  startNotificationScheduler();
});