const Gift = require('../models/Gift');
const User = require('../models/User');

// @desc Get all gifts + budget summary
// @route GET /api/gifts
const getGifts = async (req, res) => {
  try {
    const gifts = await Gift.find({ userId: req.user._id }).sort({ createdAt: -1 });
    const user = await User.findById(req.user._id);

    const spent = gifts.reduce((sum, g) => sum + (g.cost || 0), 0);

    res.status(200).json({
      gifts,
      budget: user.giftBudget || 0,
      spent,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch gifts' });
  }
};

// @desc Add new gift idea
// @route POST /api/gifts
const addGift = async (req, res) => {
  try {
    const { giftIdea, cost, personName, birthdayId } = req.body;

    if (!giftIdea || !giftIdea.trim()) {
      return res.status(400).json({ message: 'Gift idea is required' });
    }
    if (!birthdayId) {
      return res.status(400).json({ message: 'Birthday reference is required' });
    }

    const gift = await Gift.create({
      userId: req.user._id,
      birthdayId,
      personName,
      giftIdea,
      cost: cost || 0,
    });

    res.status(201).json(gift);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to add gift' });
  }
};

// @desc Update gift status
// @route PATCH /api/gifts/:id/status
const updateGiftStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Planned', 'Bought', 'Given'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const gift = await Gift.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { status },
      { new: true }
    );

    if (!gift) {
      return res.status(404).json({ message: 'Gift not found' });
    }

    res.status(200).json(gift);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to update gift status' });
  }
};

module.exports = { getGifts, addGift, updateGiftStatus };