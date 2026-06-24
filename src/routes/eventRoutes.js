const express = require('express');
const router = express.Router();
const {
  createEvent,
  getEvents,
  updateEvent,
  deleteEvent
} = require('../controllers/eventController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateFields } = require('../middleware/validationMiddleware');

router.use(protect);

router.get('/', getEvents);

// Admin modifications
router.post('/', authorize('ADMIN'), validateFields(['title', 'description', 'date', 'location']), createEvent);
router.put('/:id', authorize('ADMIN'), updateEvent);
router.delete('/:id', authorize('ADMIN'), deleteEvent);

module.exports = router;
