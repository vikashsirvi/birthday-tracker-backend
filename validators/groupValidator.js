const { body } = require('express-validator');

const groupValidator = [
  body('name').trim().notEmpty().withMessage('Group name is required'),
];

module.exports = { groupValidator };