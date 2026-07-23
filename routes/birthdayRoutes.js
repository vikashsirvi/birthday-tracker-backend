const express = require('express');
const router = express.Router();

const {
  getBirthdays,
  addBirthday,
  updateBirthday,
  deleteBirthday,
  getDashboardData,
  getInsights,
  addMemoryNote,
} = require('../controllers/birthdayController');

const { birthdayValidator } = require('../validators/birthdayValidator');
const protect = require('../middleware/authMiddleware');

router.use(protect);

router.get('/dashboard', getDashboardData);
router.get('/insights', getInsights);
router.get('/', getBirthdays);
router.post('/', birthdayValidator, addBirthday);
router.put('/:id', birthdayValidator, updateBirthday);
router.delete('/:id', deleteBirthday);
router.post('/:id/memories', addMemoryNote);

module.exports = router;