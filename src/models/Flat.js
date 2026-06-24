const mongoose = require('mongoose');

const FlatSchema = new mongoose.Schema({
  flatNumber: {
    type: String,
    required: [true, 'Flat number is required'],
    trim: true
  },
  block: {
    type: String,
    required: [true, 'Block is required'],
    trim: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  maintenanceAmount: {
    type: Number,
    required: [true, 'Maintenance amount is required'],
    default: 0
  },
  maintenanceStatus: {
    type: String,
    enum: ['PENDING', 'PAID', 'OVERDUE'],
    default: 'PENDING'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to ensure uniqueness of flat number within a block
FlatSchema.index({ flatNumber: 1, block: 1 }, { unique: true });

module.exports = mongoose.model('Flat', FlatSchema);
