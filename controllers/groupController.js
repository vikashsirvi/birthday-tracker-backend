const { validationResult } = require('express-validator');
const Group = require('../models/Group');
const Birthday = require('../models/Birthday');

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ message: errors.array()[0].msg });
    return false;
  }
  return true;
};

// @desc Get all groups with birthday counts
// @route GET /api/groups
const getGroups = async (req, res) => {
  try {
    const groups = await Group.find({ userId: req.user._id }).sort({ createdAt: 1 });

    const groupsWithCount = await Promise.all(
      groups.map(async (g) => {
        const count = await Birthday.countDocuments({ userId: req.user._id, group: g.name });
        return { _id: g._id, name: g.name, color: g.color, count };
      })
    );

    res.status(200).json(groupsWithCount);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch groups' });
  }
};

// @desc Add new group
// @route POST /api/groups
const addGroup = async (req, res) => {
  if (!handleValidation(req, res)) return;

  try {
    const { name, color } = req.body;
    const group = await Group.create({ userId: req.user._id, name, color });
    res.status(201).json({ _id: group._id, name: group.name, color: group.color, count: 0 });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to create group' });
  }
};

// @desc Update group
// @route PUT /api/groups/:id
const updateGroup = async (req, res) => {
  if (!handleValidation(req, res)) return;

  try {
    const group = await Group.findOne({ _id: req.params.id, userId: req.user._id });
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const { name, color } = req.body;
    group.name = name ?? group.name;
    group.color = color ?? group.color;
    await group.save();

    const count = await Birthday.countDocuments({ userId: req.user._id, group: group.name });
    res.status(200).json({ _id: group._id, name: group.name, color: group.color, count });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to update group' });
  }
};

// @desc Delete group
// @route DELETE /api/groups/:id
const deleteGroup = async (req, res) => {
  try {
    const group = await Group.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    res.status(200).json({ message: 'Group deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to delete group' });
  }
};

module.exports = { getGroups, addGroup, updateGroup, deleteGroup };