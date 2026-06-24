const express = require('express');
const router = express.Router();
const {
  createMaintenanceBill,
  getMaintenanceBills,
  updatePaymentStatus,
  sendPaymentReminder
} = require('../controllers/maintenanceController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateFields } = require('../middleware/validationMiddleware');

router.use(protect);

// Shared view (Inner authorization restricts to Owner and Admin)
router.get('/', authorize('ADMIN', 'OWNER'), getMaintenanceBills);

// Admin-only updates
router.post('/', authorize('ADMIN'), validateFields(['flatId', 'month', 'amount']), createMaintenanceBill);
router.put('/:id/pay', authorize('ADMIN'), validateFields(['status']), updatePaymentStatus);
router.post('/:id/remind', authorize('ADMIN'), sendPaymentReminder);

module.exports = router;
