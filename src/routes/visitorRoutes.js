const express = require('express');
const router = express.Router();
const {
  createVisitorRequest,
  approveOrRejectVisitor,
  searchVisitor,
  recordEntry,
  recordExit,
  getVisitors
} = require('../controllers/visitorController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateFields, validatePhone } = require('../middleware/validationMiddleware');

router.use(protect);

// Get visitor logs (Role-based filtering inside controller)
router.get('/', getVisitors);

// Resident operations
router.post(
  '/',
  authorize('OWNER', 'TENANT', 'ADMIN'),
  validateFields(['visitorName', 'phone', 'purpose', 'visitorType']),
  validatePhone,
  createVisitorRequest
);

router.put('/:id/status', authorize('OWNER', 'TENANT', 'ADMIN'), validateFields(['status']), approveOrRejectVisitor);

// Security operations
router.get('/search', authorize('SECURITY', 'ADMIN'), searchVisitor);
router.put('/:id/checkin', authorize('SECURITY', 'ADMIN'), recordEntry);
router.put('/:id/checkout', authorize('SECURITY', 'ADMIN'), recordExit);

module.exports = router;
