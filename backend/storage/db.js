import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');

// Ensure local fallback data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const LOCAL_STORAGE_FILE = path.join(DATA_DIR, 'local_db_fallback.json');

// Memory/File fallback store for development resilience when Mongo daemon is offline
let fallbackStore = {
  licenses: [],
  payments: [],
  downloadTokens: [],
  config: {
    v2Price: 499,
    currency: 'INR',
    priceConfigured: true
  }
};

// Load existing fallback file if available
if (fs.existsSync(LOCAL_STORAGE_FILE)) {
  try {
    const raw = fs.readFileSync(LOCAL_STORAGE_FILE, 'utf-8');
    fallbackStore = { ...fallbackStore, ...JSON.parse(raw) };
  } catch (err) {
    console.warn('[DB] Could not parse local fallback file, using fresh store:', err.message);
  }
}

function persistFallback() {
  try {
    fs.writeFileSync(LOCAL_STORAGE_FILE, JSON.stringify(fallbackStore, null, 2), 'utf-8');
  } catch (err) {
    console.error('[DB] Error persisting fallback store:', err.message);
  }
}

let isMongoConnected = false;

export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sacred_friends';
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500, // Quick timeout to prevent blocking if Mongo is not running
      connectTimeoutMS: 2500
    });
    isMongoConnected = true;
    console.log('[DB] ✅ MongoDB successfully connected to:', uri);
  } catch (err) {
    isMongoConnected = false;
    console.warn('[DB] ⚠️ MongoDB connection unavailable (' + err.message + ').');
    console.warn('[DB] 🔄 Activating resilient atomic local storage engine for development & testing.');
  }

  mongoose.connection.on('disconnected', () => {
    isMongoConnected = false;
    console.warn('[DB] ⚠️ MongoDB disconnected. Falling back to resilient local engine.');
  });

  mongoose.connection.on('reconnected', () => {
    isMongoConnected = true;
    console.log('[DB] 🔄 MongoDB reconnected.');
  });
}

export function isDbOnline() {
  return isMongoConnected;
}

// Unified repository methods that seamlessly work with MongoDB or resilient fallback
export const repository = {
  // Config
  async getConfig() {
    const envPrice = process.env.V2_PREMIUM_PRICE;
    const envCurrency = process.env.V2_PREMIUM_CURRENCY || 'INR';

    const price = envPrice !== undefined && envPrice !== '' ? Number(envPrice) : fallbackStore.config.v2Price;
    const priceConfigured = envPrice !== '' && !isNaN(price);

    return {
      v2Price: priceConfigured ? price : null,
      currency: envCurrency,
      priceConfigured: priceConfigured
    };
  },

  async setPrice(price, currency = 'INR') {
    fallbackStore.config.v2Price = price;
    fallbackStore.config.currency = currency;
    fallbackStore.config.priceConfigured = price !== null && !isNaN(price);
    persistFallback();
    return fallbackStore.config;
  },

  // Licenses
  async createLicense(data) {
    const license = {
      id: 'lic_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      licenseKey: data.licenseKey,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      paymentId: data.paymentId,
      orderId: data.orderId,
      amount: data.amount,
      currency: data.currency,
      status: 'active',
      registeredDeviceId: null,
      registeredDeviceName: null,
      activatedAt: null,
      lastValidatedAt: null,
      validationCount: 0,
      createdAt: new Date().toISOString()
    };

    fallbackStore.licenses.push(license);
    persistFallback();

    if (isMongoConnected) {
      try {
        const LicenseModel = mongoose.model('License');
        await LicenseModel.create(license);
      } catch (e) {
        console.error('[DB] Mongo save error:', e.message);
      }
    }
    return license;
  },

  async findLicenseByKey(key) {
    if (isMongoConnected) {
      try {
        const LicenseModel = mongoose.model('License');
        const doc = await LicenseModel.findOne({ licenseKey: key }).lean();
        if (doc) return doc;
      } catch (e) {
        console.warn('[DB] Mongo lookup error:', e.message);
      }
    }
    return fallbackStore.licenses.find(l => l.licenseKey === key) || null;
  },

  async updateLicense(key, updates) {
    const idx = fallbackStore.licenses.findIndex(l => l.licenseKey === key);
    if (idx !== -1) {
      fallbackStore.licenses[idx] = { ...fallbackStore.licenses[idx], ...updates, updatedAt: new Date().toISOString() };
      persistFallback();
    }

    if (isMongoConnected) {
      try {
        const LicenseModel = mongoose.model('License');
        await LicenseModel.findOneAndUpdate({ licenseKey: key }, updates, { new: true });
      } catch (e) {
        console.error('[DB] Mongo update error:', e.message);
      }
    }
    return fallbackStore.licenses[idx] || null;
  },

  async getAllLicenses() {
    if (isMongoConnected) {
      try {
        const LicenseModel = mongoose.model('License');
        const docs = await LicenseModel.find().sort({ createdAt: -1 }).lean();
        if (docs.length > 0) return docs;
      } catch (e) {
        console.warn('[DB] Mongo list error:', e.message);
      }
    }
    return [...fallbackStore.licenses].reverse();
  },

  // Orders
  async createOrder(data) {
    if (!fallbackStore.orders) fallbackStore.orders = [];
    const order = {
      orderId: data.orderId,
      paymentId: data.paymentId || null,
      amount: data.amount,
      currency: data.currency || 'INR',
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      gateway: data.gateway || 'YouPI-PG',
      status: data.status || 'CREATED',
      checkoutUrl: data.checkoutUrl || null,
      licenseKey: data.licenseKey || null,
      utr: data.utr || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    fallbackStore.orders.push(order);
    persistFallback();
    return order;
  },

  async findOrderById(orderId) {
    if (!fallbackStore.orders) fallbackStore.orders = [];
    return fallbackStore.orders.find(o => o.orderId === orderId) || null;
  },

  async updateOrder(orderId, updates) {
    if (!fallbackStore.orders) fallbackStore.orders = [];
    const idx = fallbackStore.orders.findIndex(o => o.orderId === orderId);
    if (idx !== -1) {
      fallbackStore.orders[idx] = {
        ...fallbackStore.orders[idx],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      persistFallback();
      return fallbackStore.orders[idx];
    }
    return null;
  },

  // Payments
  async recordPayment(data) {
    const payment = {
      id: 'pay_' + Date.now(),
      orderId: data.orderId,
      paymentId: data.paymentId,
      signature: data.signature,
      amount: data.amount,
      currency: data.currency,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      gateway: data.gateway || 'YouPI-PG',
      utr: data.utr || null,
      deliveryId: data.deliveryId || null,
      licenseKey: data.licenseKey || null,
      status: data.status || 'verified',
      createdAt: new Date().toISOString()
    };
    fallbackStore.payments.push(payment);
    persistFallback();

    if (isMongoConnected) {
      try {
        const PaymentModel = mongoose.model('Payment');
        await PaymentModel.create(payment);
      } catch (e) {
        console.error('[DB] Mongo payment record error:', e.message);
      }
    }
    return payment;
  },

  async findPaymentByOrderId(orderId) {
    return fallbackStore.payments.find(p => p.orderId === orderId) || null;
  },

  async findPaymentByPaymentId(paymentId) {
    return fallbackStore.payments.find(p => p.paymentId === paymentId) || null;
  },

  async findPaymentByUtr(utr) {
    if (!utr) return null;
    if (isMongoConnected) {
      try {
        const PaymentModel = mongoose.model('Payment');
        const doc = await PaymentModel.findOne({ utr }).lean();
        if (doc) return doc;
      } catch (e) {
        console.error('[DB] Mongo findPaymentByUtr error:', e.message);
      }
    }
    return fallbackStore.payments.find(p => p.utr === utr) || null;
  },

  // Protected Download Tokens
  async createDownloadToken(licenseKey) {
    const token = 'SF_DL_' + Date.now() + '_' + Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes validity
    const record = {
      token,
      licenseKey,
      expiresAt,
      downloadsCount: 0,
      createdAt: new Date().toISOString()
    };
    fallbackStore.downloadTokens.push(record);
    persistFallback();
    return record;
  },

  async verifyAndConsumeDownloadToken(token) {
    const record = fallbackStore.downloadTokens.find(t => t.token === token);
    if (!record) return { valid: false, reason: 'TOKEN_NOT_FOUND' };

    if (new Date(record.expiresAt) < new Date()) {
      return { valid: false, reason: 'TOKEN_EXPIRED' };
    }

    record.downloadsCount += 1;
    record.lastDownloadedAt = new Date().toISOString();
    persistFallback();
    return { valid: true, record };
  }
};

