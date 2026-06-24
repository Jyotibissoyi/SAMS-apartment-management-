const Flat = require('../models/Flat');
const User = require('../models/User');
const Visitor = require('../models/Visitor');
const Complaint = require('../models/Complaint');
const Maintenance = require('../models/Maintenance');

/**
 * @desc    Create a new flat
 * @route   POST /api/flats
 * @access  Private (Admin Only)
 */
const createFlat = async (req, res, next) => {
  try {
    const { flatNumber, block, maintenanceAmount } = req.body;

    // Check if flat already exists
    const flatExists = await Flat.findOne({ flatNumber, block });
    if (flatExists) {
      return res.status(400).json({ success: false, message: `Flat ${flatNumber} in Block ${block} already exists.` });
    }

    const flat = new Flat({
      flatNumber,
      block,
      maintenanceAmount: maintenanceAmount || 0
    });

    await flat.save();

    res.status(201).json({
      success: true,
      message: 'Flat created successfully',
      flat
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all flats list
 * @route   GET /api/flats
 * @access  Private (Admin, Security, Residents)
 */
const getFlats = async (req, res, next) => {
  try {
    const flats = await Flat.find()
      .populate('ownerId', 'name phone email')
      .populate('tenantId', 'name phone email')
      .sort({ block: 1, flatNumber: 1 });

    res.status(200).json({
      success: true,
      count: flats.length,
      flats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Assign Owner/Tenant directly to flat
 * @route   PUT /api/flats/:id/assign
 * @access  Private (Admin Only)
 */
const assignToFlat = async (req, res, next) => {
  try {
    const { ownerId, tenantId } = req.body;
    const flatId = req.params.id;

    const flat = await Flat.findById(flatId);
    if (!flat) {
      return res.status(404).json({ success: false, message: 'Flat not found' });
    }

    const updateFields = {};

    // 1) Verify and link owner if provided
    if (ownerId !== undefined) {
      if (ownerId) {
        const owner = await User.findById(ownerId);
        if (!owner || owner.role !== 'OWNER') {
          return res.status(400).json({ success: false, message: 'Invalid Owner ID specified.' });
        }
        updateFields.ownerId = ownerId;
        // Update user link
        await User.findByIdAndUpdate(ownerId, { flatId: flat._id });
      } else {
        // Clearing owner
        if (flat.ownerId) {
          await User.findByIdAndUpdate(flat.ownerId, { flatId: null });
        }
        updateFields.ownerId = null;
      }
    }

    // 2) Verify and link tenant if provided
    if (tenantId !== undefined) {
      if (tenantId) {
        const tenant = await User.findById(tenantId);
        if (!tenant || tenant.role !== 'TENANT') {
          return res.status(400).json({ success: false, message: 'Invalid Tenant ID specified.' });
        }
        updateFields.tenantId = tenantId;
        // Update user link
        await User.findByIdAndUpdate(tenantId, { flatId: flat._id });
      } else {
        // Clearing tenant
        if (flat.tenantId) {
          await User.findByIdAndUpdate(flat.tenantId, { flatId: null });
        }
        updateFields.tenantId = null;
      }
    }

    const updatedFlat = await Flat.findByIdAndUpdate(flatId, updateFields, { new: true })
      .populate('ownerId', 'name phone')
      .populate('tenantId', 'name phone');

    res.status(200).json({
      success: true,
      message: 'Flat assignments updated successfully.',
      flat: updatedFlat
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Admin Dashboard aggregate statistics
 * @route   GET /api/flats/dashboard/stats
 * @access  Private (Admin Only)
 */
const getDashboardStats = async (req, res, next) => {
  try {
    // 1) Total Flats
    const totalFlats = await Flat.countDocuments();

    // 2) Total Residents (Owners + Tenants)
    const totalResidents = await User.countDocuments({ role: { $in: ['OWNER', 'TENANT'] }, isActive: true });

    // 3) Total Owners
    const totalOwners = await User.countDocuments({ role: 'OWNER', isActive: true });

    // 4) Total Tenants
    const totalTenants = await User.countDocuments({ role: 'TENANT', isActive: true });

    // 5) Total Visitors Today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    
    const totalVisitorsToday = await Visitor.countDocuments({
      createdAt: { $gte: startOfToday, $lte: endOfToday }
    });

    // 6) Open Complaints (status !== RESOLVED)
    const openComplaints = await Complaint.countDocuments({ status: { $in: ['OPEN', 'IN_PROGRESS'] } });

    // 7) Pending Maintenance (count of unpaid maintenance notifications)
    const pendingMaintenance = await Maintenance.countDocuments({ status: 'UNPAID' });

    res.status(200).json({
      success: true,
      stats: {
        totalFlats,
        totalResidents,
        totalOwners,
        totalTenants,
        totalVisitorsToday,
        openComplaints,
        pendingMaintenance
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createFlat,
  getFlats,
  assignToFlat,
  getDashboardStats
};
