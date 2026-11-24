import mongoose from 'mongoose';

const LicenseSchema = new mongoose.Schema({
  licenseKey: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  customerName: {
    type: String,
    required: true
  },
  customerEmail: {
    type: String,
    required: true,
    index: true
  },
  paymentId: {
    type: String,
    required: true
  },
  orderId: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  status: {
    type: String,
    enum: ['active', 'revoked', 'suspended'],
    default: 'active'
  },
  registeredDeviceId: {
    type: String,
    default: null,
    index: true
  },
  registeredDeviceName: {
    type: String,
    default: null
  },
  activatedAt: {
    type: Date,
    default: null
  },
  lastValidatedAt: {
    type: Date,
    default: null
  },
  validationCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const License = mongoose.models.License || mongoose.model('License', LicenseSchema);

