const Complaint = require('../models/Complaint');
const User = require('../models/User');
const { sendNotification } = require('../config/fcm');

/**
 * @desc    File a new complaint
 * @route   POST /api/complaints
 * @access  Private (Owner, Tenant)
 */
const createComplaint = async (req, res, next) => {
  try {
    const { category, description } = req.body;

    if (!req.user.flatId) {
      return res.status(400).json({ success: false, message: 'You must be assigned to a flat to file complaints.' });
    }

    const complaint = new Complaint({
      flatId: req.user.flatId,
      residentId: req.user.id,
      category,
      description
    });

    await complaint.save();

    res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully.',
      complaint
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    View all complaints or user's complaints
 * @route   GET /api/complaints
 * @access  Private (Admin, Owner, Tenant)
 */
const getComplaints = async (req, res, next) => {
  try {
    let query = {};

    // Filter by user's flat if not Admin
    if (req.user.role !== 'ADMIN') {
      if (!req.user.flatId) {
        return res.status(200).json({ success: true, count: 0, complaints: [] });
      }
      query.flatId = req.user.flatId;
    }

    const complaints = await Complaint.find(query)
      .populate('flatId', 'flatNumber block')
      .populate('residentId', 'name phone')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: complaints.length,
      complaints
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update complaint status & remark
 * @route   PUT /api/complaints/:id/status
 * @access  Private (Admin Only)
 */
const updateComplaintStatus = async (req, res, next) => {
  try {
    const { status, adminRemark } = req.body;
    const complaintId = req.params.id;

    if (!['OPEN', 'IN_PROGRESS', 'RESOLVED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid complaint status' });
    }

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    complaint.status = status;
    if (adminRemark !== undefined) {
      complaint.adminRemark = adminRemark;
    }
    
    await complaint.save();

    // Notify resident about complaint update
    await sendNotification({
      title: '🛠️ Complaint Status Updated',
      body: `Your complaint about "${complaint.category}" is now: ${status}. Remark: ${adminRemark || 'None'}`,
      token: complaint.residentId.toString(),
      data: { complaintId: complaint._id.toString(), status }
    });

    res.status(200).json({
      success: true,
      message: 'Complaint status updated successfully.',
      complaint
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createComplaint,
  getComplaints,
  updateComplaintStatus
};
