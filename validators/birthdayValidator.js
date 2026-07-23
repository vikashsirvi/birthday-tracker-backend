const { body } = require('express-validator');

const birthdayValidator = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('dob')
    .notEmpty().withMessage('Date of birth is required')
    .isISO8601().withMessage('Enter a valid date')
    .custom((value) => {
      if (new Date(value) > new Date()) {
        throw new Error('Date of birth cannot be in the future');
      }
      return true;
    }),
];

module.exports = { birthdayValidator };