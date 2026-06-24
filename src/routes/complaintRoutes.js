const express = require('express');
const router = express.Router();
const {
  createComplaint,
  getComplaints,
  updateComplaintStatus
} = require('../controllers/complaintController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateFields } = require('../middleware/validationMiddleware');

router.use(protect);

// Shared view
router.get('/', getComplaints);

// Resident filing
router.post('/', authorize('OWNER', 'TENANT'), validateFields(['category', 'description']), createComplaint);

// Admin processing
router.put('/:id/status', authorize('ADMIN'), validateFields(['status']), updateComplaintStatus);

module.exports = router;
