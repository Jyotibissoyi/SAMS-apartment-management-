const Visitor = require('../models/Visitor');
const Flat = require('../models/Flat');
const User = require('../models/User');
const { sendNotification } = require('../config/fcm');

// Helper to generate a 6-digit numeric access code
const generateAccessCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * @desc    Create a visitor request
 * @route   POST /api/visitors
 * @access  Private (Owner, Tenant, Admin)
 */
const createVisitorRequest = async (req, res, next) => {
  try {
    const { visitorName, phone, vehicleNumber, purpose, visitorType } = req.body;
    
    // Check resident's flat context
    const resident = await User.findById(req.user.id);
    if (!resident.flatId) {
      return res.status(400).json({ success: false, message: 'Your user profile is not linked to any flat. Cannot create visitor request.' });
    }

    const flat = await Flat.findById(resident.flatId);
    if (!flat) {
      return res.status(404).json({ success: false, message: 'Linked flat details not found.' });
    }

    let accessCode = null;
    let status = 'PENDING';

    // Daily visitors are pre-approved and get a 6-digit access code
    if (visitorType === 'DAILY') {
      accessCode = generateAccessCode();
      status = 'APPROVED';
    } else {
      // One-time visitors get an access code too for quick check-in at security gate
      accessCode = generateAccessCode();
    }

    const visitor = new Visitor({
      visitorName,
      phone,
      vehicleNumber: vehicleNumber || '',
      purpose,
      flatId: flat._id,
      visitorType,
      status,
      accessCode,
      createdBy: req.user.id
    });

    await visitor.save();

    // Trigger FCM Notification if status is PENDING (alerting Security or residents)
    if (status === 'PENDING') {
      await sendNotification({
        title: 'New Guest Awaiting Approval',
        body: `${visitorName} is requesting entry to Flat ${flat.flatNumber}-${flat.block} for: ${purpose}`,
        topic: 'SECURITY',
        data: { visitorId: visitor._id.toString() }
      });
    }

    res.status(201).json({
      success: true,
      message: visitorType === 'DAILY' ? 'Daily visitor registered with access code.' : 'Visitor request registered.',
      visitor
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve or Reject visitor request
 * @route   PUT /api/visitors/:id/status
 * @access  Private (Owner, Tenant, Admin)
 */
const approveOrRejectVisitor = async (req, res, next) => {
  try {
    const { status } = req.body; // APPROVED or REJECTED
    const visitorId = req.params.id;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be APPROVED or REJECTED.' });
    }

    const visitor = await Visitor.findById(visitorId).populate('flatId', 'flatNumber block');
    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor request not found.' });
    }

    // Verify ownership: Resident must belong to the same flat
    if (req.user.role !== 'ADMIN' && req.user.flatId.toString() !== visitor.flatId._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to approve/reject guests for other flats.' });
    }

    visitor.status = status;
    await visitor.save();

    // Notify Security Guard
    await sendNotification({
      title: `Visitor request ${status.toLowerCase()}`,
      body: `Resident ${status.toLowerCase()} entry for guest ${visitor.visitorName} to Flat ${visitor.flatId.flatNumber}`,
      topic: 'SECURITY',
      data: { visitorId: visitor._id.toString(), status }
    });

    res.status(200).json({
      success: true,
      message: `Visitor request ${status.toLowerCase()} successfully.`,
      visitor
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Search visitor by Access Code OR Phone Number
 * @route   GET /api/visitors/search
 * @access  Private (Security, Admin)
 */
const searchVisitor = async (req, res, next) => {
  try {
    const { query } = req.query; // phone or accessCode
    if (!query) {
      return res.status(400).json({ success: false, message: 'Please provide an access code or phone number to search.' });
    }

    // Search by code or phone
    const visitor = await Visitor.findOne({
      $or: [
        { accessCode: query },
        { phone: query }
      ]
    })
    .populate('flatId', 'flatNumber block ownerId tenantId')
    .populate('createdBy', 'name phone')
    .sort({ createdAt: -1 }); // Get latest request

    if (!visitor) {
      return res.status(404).json({ success: false, message: 'No active visitor record found matching search query.' });
    }

    // Look up resident name to display at gate
    let residentName = 'Unknown';
    if (visitor.flatId) {
      const flatDetail = visitor.flatId;
      const resId = flatDetail.tenantId || flatDetail.ownerId;
      if (resId) {
        const resUser = await User.findById(resId).select('name');
        if (resUser) residentName = resUser.name;
      }
    }

    res.status(200).json({
      success: true,
      visitor,
      residentName
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Record visitor check-in (Entry)
 * @route   PUT /api/visitors/:id/checkin
 * @access  Private (Security, Admin)
 */
const recordEntry = async (req, res, next) => {
  try {
    const visitorId = req.params.id;
    const visitor = await Visitor.findById(visitorId).populate('flatId', 'flatNumber block ownerId tenantId');

    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor record not found.' });
    }

    if (visitor.status !== 'APPROVED') {
      return res.status(400).json({ success: false, message: `Cannot check-in. Visitor status is currently: ${visitor.status}.` });
    }

    if (visitor.entryTime) {
      return res.status(400).json({ success: false, message: 'Visitor has already checked-in.' });
    }

    visitor.entryTime = new Date();
    await visitor.save();

    // Notify resident of the guest check-in
    // We send to both Owner and Tenant if linked to flat
    const residents = [visitor.flatId.ownerId, visitor.flatId.tenantId].filter(id => id);
    for (const residentId of residents) {
      await sendNotification({
        title: '🔔 Guest Checked-In',
        body: `Your guest ${visitor.visitorName} has entered the gate at ${visitor.entryTime.toLocaleTimeString()}.`,
        token: residentId.toString(), // Token mock handles user specific routing
        data: { visitorId: visitor._id.toString() }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Visitor check-in entry recorded.',
      visitor
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Record visitor check-out (Exit)
 * @route   PUT /api/visitors/:id/checkout
 * @access  Private (Security, Admin)
 */
const recordExit = async (req, res, next) => {
  try {
    const visitorId = req.params.id;
    const visitor = await Visitor.findById(visitorId).populate('flatId', 'flatNumber block ownerId tenantId');

    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor record not found.' });
    }

    if (!visitor.entryTime) {
      return res.status(400).json({ success: false, message: 'Cannot record exit. Visitor has not checked-in yet.' });
    }

    if (visitor.exitTime) {
      return res.status(400).json({ success: false, message: 'Visitor has already checked-out.' });
    }

    visitor.exitTime = new Date();
    await visitor.save();

    // Notify resident of the guest check-out
    const residents = [visitor.flatId.ownerId, visitor.flatId.tenantId].filter(id => id);
    for (const residentId of residents) {
      await sendNotification({
        title: '🚪 Guest Checked-Out',
        body: `Your guest ${visitor.visitorName} has exited the premises at ${visitor.exitTime.toLocaleTimeString()}.`,
        token: residentId.toString(),
        data: { visitorId: visitor._id.toString() }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Visitor check-out exit recorded.',
      visitor
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get visitor logs (Role-based filtering)
 * @route   GET /api/visitors
 * @access  Private (Admin, Security, Residents)
 */
const getVisitors = async (req, res, next) => {
  try {
    let query = {};

    // 1) Residents only see their own visitor logs
    if (req.user.role === 'OWNER' || req.user.role === 'TENANT') {
      if (req.user.flatId) {
        query.flatId = req.user.flatId;
      } else {
        query.createdBy = req.user.id;
      }
    }

    // 2) Security query filters (can pass type, date, status in query params)
    const { visitorType, status, today } = req.query;
    if (visitorType) query.visitorType = visitorType;
    if (status) query.status = status;

    if (today === 'true') {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: startOfToday, $lte: endOfToday };
    }

    const visitors = await Visitor.find(query)
      .populate('flatId', 'flatNumber block')
      .populate('createdBy', 'name phone')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: visitors.length,
      visitors
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createVisitorRequest,
  approveOrRejectVisitor,
  searchVisitor,
  recordEntry,
  recordExit,
  getVisitors
};
