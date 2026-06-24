const express = require('express');
const router = express.Router();
const {
  createFlat,
  getFlats,
  assignToFlat,
  getDashboardStats
} = require('../controllers/flatController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateFields } = require('../middleware/validationMiddleware');

router.use(protect);

// Dashboard metrics
router.get('/dashboard/stats', authorize('ADMIN'), getDashboardStats);

// Flat CRUD operations
router.post('/', authorize('ADMIN'), validateFields(['flatNumber', 'block']), createFlat);
router.get('/', getFlats);
router.put('/:id/assign', authorize('ADMIN'), assignToFlat);

module.exports = router;
