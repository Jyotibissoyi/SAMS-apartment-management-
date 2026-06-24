const mongoose = require('mongoose');

const VisitorSchema = new mongoose.Schema({
  visitorName: {
    type: String,
    required: [true, 'Visitor name is required'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Visitor phone number is required'],
    trim: true
  },
  vehicleNumber: {
    type: String,
    trim: true,
    default: ''
  },
  purpose: {
    type: String,
    required: [true, 'Purpose of visit is required'],
    trim: true
  },
  flatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Flat',
    required: [true, 'Flat target is required']
  },
  visitorType: {
    type: String,
    enum: ['ONE_TIME', 'DAILY'],
    required: [true, 'Visitor type is required']
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  },
  entryTime: {
    type: Date,
    default: null
  },
  exitTime: {
    type: Date,
    default: null
  },
  accessCode: {
    type: String,
    trim: true,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created-by user is required']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Visitor', VisitorSchema);
