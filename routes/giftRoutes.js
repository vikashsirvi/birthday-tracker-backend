const express = require('express');
const router = express.Router();

const { getGifts, addGift, updateGiftStatus } = require('../controllers/giftController');
const protect = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getGifts);
router.post('/', addGift);
router.patch('/:id/status', updateGiftStatus);

module.exports = router;