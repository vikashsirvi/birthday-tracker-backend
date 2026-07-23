const express = require('express');
const router = express.Router();

const { getGroups, addGroup, updateGroup, deleteGroup } = require('../controllers/groupController');
const { groupValidator } = require('../validators/groupValidator');
const protect = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getGroups);
router.post('/', groupValidator, addGroup);
router.put('/:id', groupValidator, updateGroup);
router.delete('/:id', deleteGroup);

module.exports = router;