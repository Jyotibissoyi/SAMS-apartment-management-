const User = require('../models/User');
const Flat = require('../models/Flat');

/**
 * @desc    Add a new Resident (Owner or Tenant)
 * @route   POST /api/users/resident
 * @access  Private (Admin Only)
 */
const addResident = async (req, res, next) => {
  try {
    const { name, phone, email, password, role, flatId } = req.body;

    if (!['OWNER', 'TENANT'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role. Resident must be OWNER or TENANT.' });
    }

    // 1) Check if phone already registered
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'A user with this phone number already exists.' });
    }

    // 2) Validate flat if provided
    if (flatId) {
      const flat = await Flat.findById(flatId);
      if (!flat) {
        return res.status(404).json({ success: false, message: 'Flat not found.' });
      }
    }

    // 3) Create Resident
    const resident = new User({
      name,
      phone,
      email,
      password,
      role,
      flatId: flatId || null
    });

    await resident.save();

    // 4) Update Flat links if flatId provided
    if (flatId) {
      const updateData = {};
      if (role === 'OWNER') {
        updateData.ownerId = resident._id;
      } else {
        updateData.tenantId = resident._id;
      }
      await Flat.findByIdAndUpdate(flatId, updateData);
    }

    // Remove password from response
    resident.password = undefined;

    res.status(201).json({
      success: true,
      message: `${role} added successfully.`,
      resident
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all residents
 * @route   GET /api/users/residents
 * @access  Private (Admin & Security)
 */
const getResidents = async (req, res, next) => {
  try {
    const { role, active } = req.query;
    const filter = { role: { $in: ['OWNER', 'TENANT'] } };

    if (role) filter.role = role;
    if (active) filter.isActive = active === 'true';

    const residents = await User.find(filter)
      .populate('flatId', 'flatNumber block')
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: residents.length,
      residents
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update resident details
 * @route   PUT /api/users/residents/:id
 * @access  Private (Admin Only)
 */
const updateResident = async (req, res, next) => {
  try {
    const { name, phone, email, role, flatId, isActive } = req.body;
    const residentId = req.params.id;

    const resident = await User.findById(residentId);
    if (!resident) {
      return res.status(404).json({ success: false, message: 'Resident not found' });
    }

    // Validate phone change uniqueness
    if (phone && phone !== resident.phone) {
      const phoneTaken = await User.findOne({ phone });
      if (phoneTaken) {
        return res.status(400).json({ success: false, message: 'Phone number already in use by another user' });
      }
      resident.phone = phone;
    }

    if (name) resident.name = name;
    if (email !== undefined) resident.email = email;
    if (isActive !== undefined) resident.isActive = isActive;

    const oldFlatId = resident.flatId;
    const oldRole = resident.role;

    if (role && ['OWNER', 'TENANT'].includes(role)) {
      resident.role = role;
    }

    // If flat assignment is updated
    if (flatId !== undefined) {
      resident.flatId = flatId || null;
    }

    await resident.save();

    // Sync Flat references
    // 1. Clear old flat references if assignment or role changed
    if (oldFlatId) {
      const oldFlatUpdate = {};
      if (oldRole === 'OWNER') oldFlatUpdate.ownerId = null;
      else oldFlatUpdate.tenantId = null;

      await Flat.findByIdAndUpdate(oldFlatId, oldFlatUpdate);
    }

    // 2. Assign to new flat if flatId provided
    if (resident.flatId) {
      const newFlatUpdate = {};
      if (resident.role === 'OWNER') newFlatUpdate.ownerId = resident._id;
      else newFlatUpdate.tenantId = resident._id;

      await Flat.findByIdAndUpdate(resident.flatId, newFlatUpdate);
    }

    resident.password = undefined;

    res.status(200).json({
      success: true,
      message: 'Resident updated successfully.',
      resident
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a resident
 * @route   DELETE /api/users/residents/:id
 * @access  Private (Admin Only)
 */
const deleteResident = async (req, res, next) => {
  try {
    const residentId = req.params.id;
    const resident = await User.findById(residentId);

    if (!resident) {
      return res.status(404).json({ success: false, message: 'Resident not found' });
    }

    // Clear flat references
    if (resident.flatId) {
      const flatUpdate = {};
      if (resident.role === 'OWNER') flatUpdate.ownerId = null;
      else flatUpdate.tenantId = null;

      await Flat.findByIdAndUpdate(resident.flatId, flatUpdate);
    }

    await User.findByIdAndDelete(residentId);

    res.status(200).json({
      success: true,
      message: 'Resident deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Assign Flat directly to a resident
 * @route   POST /api/users/assign-flat
 * @access  Private (Admin Only)
 */
const assignFlat = async (req, res, next) => {
  try {
    const { residentId, flatId } = req.body;

    const resident = await User.findById(residentId);
    if (!resident) {
      return res.status(404).json({ success: false, message: 'Resident not found' });
    }

    if (!['OWNER', 'TENANT'].includes(resident.role)) {
      return res.status(400).json({ success: false, message: 'Can only assign flats to OWNERS or TENANTS' });
    }

    const flat = await Flat.findById(flatId);
    if (!flat) {
      return res.status(404).json({ success: false, message: 'Flat not found' });
    }

    // Clear old flat links
    if (resident.flatId) {
      const clearUpdate = {};
      if (resident.role === 'OWNER') clearUpdate.ownerId = null;
      else clearUpdate.tenantId = null;
      await Flat.findByIdAndUpdate(resident.flatId, clearUpdate);
    }

    // Update resident model
    resident.flatId = flatId;
    await resident.save();

    // Update flat model links
    const flatUpdate = {};
    if (resident.role === 'OWNER') {
      flatUpdate.ownerId = resident._id;
    } else {
      flatUpdate.tenantId = resident._id;
    }
    await Flat.findByIdAndUpdate(flatId, flatUpdate);

    res.status(200).json({
      success: true,
      message: 'Flat assigned successfully',
      resident
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addResident,
  getResidents,
  updateResident,
  deleteResident,
  assignFlat
};
