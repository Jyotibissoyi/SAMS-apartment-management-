const express = require('express');
const router = express.Router();
const { login, getProfile } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { validateFields } = require('../middleware/validationMiddleware');

router.post('/login', validateFields(['phone', 'password']), login);
router.get('/profile', protect, getProfile);

module.exports = router;
