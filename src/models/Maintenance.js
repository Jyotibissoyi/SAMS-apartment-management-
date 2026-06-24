const mongoose = require('mongoose');

const MaintenanceSchema = new mongoose.Schema({
  flatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Flat',
    required: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  month: {
    type: String,
    required: [true, 'Month (e.g. "June 2026") is required'],
    trim: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  message: {
    type: String,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    enum: ['UNPAID', 'PAID'],
    default: 'UNPAID'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure a flat only receives one maintenance notification per month
MaintenanceSchema.index({ flatId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Maintenance', MaintenanceSchema);
