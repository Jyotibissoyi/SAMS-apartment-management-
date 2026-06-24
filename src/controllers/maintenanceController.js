const Maintenance = require('../models/Maintenance');
const Flat = require('../models/Flat');
const User = require('../models/User');
const { sendNotification } = require('../config/fcm');

/**
 * @desc    Create a maintenance notification for a flat
 * @route   POST /api/maintenance
 * @access  Private (Admin Only)
 */
const createMaintenanceBill = async (req, res, next) => {
  try {
    const { flatId, month, amount, message } = req.body;

    const flat = await Flat.findById(flatId);
    if (!flat) {
      return res.status(404).json({ success: false, message: 'Flat not found' });
    }

    if (!flat.ownerId) {
      return res.status(400).json({ success: false, message: 'This flat does not have an owner assigned. Cannot create maintenance bill.' });
    }

    // Check if bill already exists for this flat & month
    const existingBill = await Maintenance.findOne({ flatId, month });
    if (existingBill) {
      return res.status(400).json({ success: false, message: `Maintenance bill for this month (${month}) already exists for Flat ${flat.flatNumber}.` });
    }

    const bill = new Maintenance({
      flatId,
      ownerId: flat.ownerId,
      month,
      amount,
      message: message || `Maintenance dues for ${month}`,
      status: 'UNPAID'
    });

    await bill.save();

    // Trigger Flat status update to PENDING/OVERDUE
    flat.maintenanceStatus = 'PENDING';
    await flat.save();

    // Notify flat owner
    await sendNotification({
      title: '💰 Maintenance Bill Generated',
      body: `Maintenance dues of Rs. ${amount} generated for Flat ${flat.flatNumber} - Month: ${month}.`,
      token: flat.ownerId.toString(),
      data: { billId: bill._id.toString() }
    });

    res.status(201).json({
      success: true,
      message: 'Maintenance bill generated successfully.',
      bill
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    View maintenance bills
 * @route   GET /api/maintenance
 * @access  Private (Admin, Owner Only)
 */
const getMaintenanceBills = async (req, res, next) => {
  try {
    // Tenants cannot see maintenance bills
    if (req.user.role === 'TENANT') {
      return res.status(403).json({ success: false, message: 'Access denied: Tenants are not authorized to view maintenance notifications.' });
    }

    let query = {};

    // Owners can only see their own bills
    if (req.user.role === 'OWNER') {
      query.ownerId = req.user.id;
    }

    const bills = await Maintenance.find(query)
      .populate('flatId', 'flatNumber block')
      .populate('ownerId', 'name phone')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bills.length,
      bills
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update maintenance payment status (Offline Payment)
 * @route   PUT /api/maintenance/:id/pay
 * @access  Private (Admin Only)
 */
const updatePaymentStatus = async (req, res, next) => {
  try {
    const { status } = req.body; // PAID or UNPAID
    const billId = req.params.id;

    if (!['PAID', 'UNPAID'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be PAID or UNPAID.' });
    }

    const bill = await Maintenance.findById(billId).populate('flatId');
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Maintenance record not found.' });
    }

    bill.status = status === 'PAID' ? 'PAID' : 'UNPAID';
    await bill.save();

    // Sync status to Flat model
    const flat = bill.flatId;
    if (flat) {
      // Check if there are other unpaid bills
      const unpaidBills = await Maintenance.countDocuments({ flatId: flat._id, status: 'UNPAID' });
      flat.maintenanceStatus = unpaidBills > 0 ? 'PENDING' : 'PAID';
      await flat.save();
    }

    // Send notification
    await sendNotification({
      title: status === 'PAID' ? '✅ Payment Confirmed' : '⚠️ Maintenance Dues Updated',
      body: `Your payment of Rs. ${bill.amount} for the month of ${bill.month} is marked as ${status.toLowerCase()}.`,
      token: bill.ownerId.toString(),
      data: { billId: bill._id.toString(), status }
    });

    res.status(200).json({
      success: true,
      message: `Bill status marked as ${status}.`,
      bill
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Send maintenance payment reminder
 * @route   POST /api/maintenance/:id/remind
 * @access  Private (Admin Only)
 */
const sendPaymentReminder = async (req, res, next) => {
  try {
    const billId = req.params.id;
    const bill = await Maintenance.findById(billId).populate('flatId', 'flatNumber block');

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Maintenance record not found.' });
    }

    if (bill.status === 'PAID') {
      return res.status(400).json({ success: false, message: 'Cannot send reminder for a paid bill.' });
    }

    // Send Reminder Notification
    await sendNotification({
      title: '🚨 Maintenance Payment Reminder',
      body: `Gentle reminder: Maintenance dues of Rs. ${bill.amount} for the month of ${bill.month} are pending for Flat ${bill.flatId.flatNumber}. Please clear as soon as possible.`,
      token: bill.ownerId.toString(),
      data: { billId: bill._id.toString() }
    });

    res.status(200).json({
      success: true,
      message: 'Reminder notification dispatched.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createMaintenanceBill,
  getMaintenanceBills,
  updatePaymentStatus,
  sendPaymentReminder
};
