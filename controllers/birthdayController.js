const { validationResult } = require('express-validator');
const Birthday = require('../models/Birthday');
const User = require('../models/User');
const { calculateAge, getDaysUntilBirthday, getZodiacSign } = require('../utils/ageHelper');

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ message: errors.array()[0].msg });
    return false;
  }
  return true;
};

const formatBirthday = (b) => ({
  _id: b._id,
  name: b.name,
  dob: b.dob.toISOString().split('T')[0],
  group: b.group,
  phone: b.phone,
  email: b.email,
  photo: b.photo,
  notes: b.notes,
  age: calculateAge(b.dob),
  daysLeft: getDaysUntilBirthday(b.dob),
  memories: b.memories,
});

// @desc Get all birthdays for logged-in user
// @route GET /api/birthdays
const getBirthdays = async (req, res) => {
  try {
    const birthdays = await Birthday.find({ userId: req.user._id }).sort({ dob: 1 });
    res.status(200).json(birthdays.map(formatBirthday));
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch birthdays' });
  }
};

// @desc Add new birthday
// @route POST /api/birthdays
const addBirthday = async (req, res) => {
  if (!handleValidation(req, res)) return;

  try {
    const { name, dob, group, phone, email, notes, photo } = req.body;
    const birthday = await Birthday.create({
      userId: req.user._id,
      name, dob, group, phone, email, notes, photo,
    });
    res.status(201).json(formatBirthday(birthday));
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to add birthday' });
  }
};

// @desc Update birthday
// @route PUT /api/birthdays/:id
const updateBirthday = async (req, res) => {
  if (!handleValidation(req, res)) return;

  try {
    const birthday = await Birthday.findOne({ _id: req.params.id, userId: req.user._id });
    if (!birthday) {
      return res.status(404).json({ message: 'Birthday not found' });
    }

    const { name, dob, group, phone, email, notes, photo } = req.body;
    birthday.name = name ?? birthday.name;
    birthday.dob = dob ?? birthday.dob;
    birthday.group = group ?? birthday.group;
    birthday.phone = phone ?? birthday.phone;
    birthday.email = email ?? birthday.email;
    birthday.notes = notes ?? birthday.notes;
    birthday.photo = photo ?? birthday.photo;

    await birthday.save();
    res.status(200).json(formatBirthday(birthday));
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to update birthday' });
  }
};

// @desc Delete birthday
// @route DELETE /api/birthdays/:id
const deleteBirthday = async (req, res) => {
  try {
    const birthday = await Birthday.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!birthday) {
      return res.status(404).json({ message: 'Birthday not found' });
    }
    res.status(200).json({ message: 'Birthday deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to delete birthday' });
  }
};

// @desc Dashboard summary data
// @route GET /api/birthdays/dashboard
const getDashboardData = async (req, res) => {
  try {
    const birthdays = await Birthday.find({ userId: req.user._id });

    const today = new Date();
    const todayMonthDay = `${today.getMonth()}-${today.getDate()}`;

    const todayBirthdays = birthdays
      .filter((b) => {
        const d = new Date(b.dob);
        return `${d.getMonth()}-${d.getDate()}` === todayMonthDay;
      })
      .map((b) => ({
        _id: b._id,
        name: b.name,
        photo: b.photo,
        age: calculateAge(b.dob) + 1,
      }));

    const upcomingBirthdays = birthdays
      .map((b) => ({
        _id: b._id,
        name: b.name,
        photo: b.photo,
        group: b.group,
        daysLeft: getDaysUntilBirthday(b.dob),
      }))
      .filter((b) => b.daysLeft <= 7)
      .sort((a, b) => a.daysLeft - b.daysLeft);

    const birthdayDates = birthdays.map((b) => {
      const d = new Date(b.dob);
      const year = today.getFullYear();
      return `${year}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });

    const thisMonth = birthdays.filter((b) => new Date(b.dob).getMonth() === today.getMonth()).length;
    const upcomingWeek = upcomingBirthdays.length;

    res.status(200).json({
      todayBirthdays,
      upcomingBirthdays,
      birthdayDates,
      stats: {
        total: birthdays.length,
        thisMonth,
        upcomingWeek,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch dashboard data' });
  }
};

// @desc Insights (charts data)
// @route GET /api/birthdays/insights
const getInsights = async (req, res) => {
  try {
    const birthdays = await Birthday.find({ userId: req.user._id });

    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const perMonthMap = {};
    monthNames.forEach((m) => (perMonthMap[m] = 0));
    birthdays.forEach((b) => {
      const m = monthNames[new Date(b.dob).getMonth()];
      perMonthMap[m]++;
    });
    const perMonth = monthNames.map((m) => ({ month: m, count: perMonthMap[m] }));

    const zodiacMap = {};
    birthdays.forEach((b) => {
      const sign = getZodiacSign(b.dob);
      zodiacMap[sign] = (zodiacMap[sign] || 0) + 1;
    });
    const zodiac = Object.entries(zodiacMap).map(([sign, count]) => ({ sign, count }));

    const ageRanges = [
      { range: '0-18', min: 0, max: 18 },
      { range: '19-30', min: 19, max: 30 },
      { range: '31-45', min: 31, max: 45 },
      { range: '46-60', min: 46, max: 60 },
      { range: '60+', min: 61, max: 200 },
    ];
    const ageGroups = ageRanges.map((r) => ({
      range: r.range,
      count: birthdays.filter((b) => {
        const age = calculateAge(b.dob);
        return age >= r.min && age <= r.max;
      }).length,
    }));

    res.status(200).json({ perMonth, zodiac, ageGroups });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch insights' });
  }
};

// @desc Add memory note to a birthday
// @route POST /api/birthdays/:id/memories
const addMemoryNote = async (req, res) => {
  try {
    const birthday = await Birthday.findOne({ _id: req.params.id, userId: req.user._id });
    if (!birthday) {
      return res.status(404).json({ message: 'Birthday not found' });
    }

    const { year, note } = req.body;
    if (!note || !note.trim()) {
      return res.status(400).json({ message: 'Memory note cannot be empty' });
    }

    birthday.memories.push({ year: year || new Date().getFullYear(), note });
    await birthday.save();

    res.status(200).json(formatBirthday(birthday));
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to add memory note' });
  }
};

module.exports = {
  getBirthdays,
  addBirthday,
  updateBirthday,
  deleteBirthday,
  getDashboardData,
  getInsights,
  addMemoryNote,
};