const express = require('express');
const router = express.Router();
const { createNotice, getNotices } = require('../controllers/noticeController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateFields } = require('../middleware/validationMiddleware');

router.use(protect);

router.post('/', authorize('ADMIN'), validateFields(['title', 'description', 'targetRole']), createNotice);
router.get('/', getNotices);

module.exports = router;
