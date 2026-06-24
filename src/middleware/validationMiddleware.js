/**
 * Validates mandatory fields in request body
 * @param {string[]} fields Array of field names that are required
 */
const validateFields = (fields) => {
  return (req, res, next) => {
    const missingFields = [];
    for (const field of fields) {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Validation Error: Missing required fields: ${missingFields.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Validates phone numbers using simple digit check
 */
const validatePhone = (req, res, next) => {
  const { phone } = req.body;
  if (phone) {
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    if (cleanPhone.length < 8 || cleanPhone.length > 15) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error: Phone number must be between 8 and 15 digits.'
      });
    }
  }
  next();
};

module.exports = {
  validateFields,
  validatePhone
};
