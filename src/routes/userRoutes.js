const express = require('express');
const router = express.Router();
const {
  addResident,
  getResidents,
  updateResident,
  deleteResident,
  assignFlat
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateFields, validatePhone } = require('../middleware/validationMiddleware');

router.use(protect); // All user routes require authentication

// Admin only operations
router.post(
  '/resident',
  authorize('ADMIN'),
  validateFields(['name', 'phone', 'password', 'role']),
  validatePhone,
  addResident
);

router.put('/residents/:id', authorize('ADMIN'), updateResident);
router.delete('/residents/:id', authorize('ADMIN'), deleteResident);
router.post('/assign-flat', authorize('ADMIN'), validateFields(['residentId', 'flatId']), assignFlat);

// Admin and Security operation
router.get('/residents', authorize('ADMIN', 'SECURITY'), getResidents);

module.exports = router;
