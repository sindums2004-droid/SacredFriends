import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_FILE = path.join(DATA_DIR, 'db.json');
const CHARACTERS_FILE = path.join(DATA_DIR, 'characters.json');

// In-Memory & File-backed Store (Pure JSON, No MongoDB, No SQLite)
let dbStore = {
  users: [],
  licenses: [],
  orders: [],
  payments: [],
  downloadTokens: [],
  config: {
    v2Price: 499,
    currency: 'INR',
    priceConfigured: true
  }
};

// Initialize DB from JSON file
function loadDB() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      dbStore = { ...dbStore, ...JSON.parse(raw) };
    } catch (err) {
      console.warn('[DB] Could not parse db.json, initializing fresh store:', err.message);
    }
  } else {
    // Check if legacy fallback exists and migrate
    const legacyFallback = path.join(DATA_DIR, 'local_db_fallback.json');
    if (fs.existsSync(legacyFallback)) {
      try {
        const raw = fs.readFileSync(legacyFallback, 'utf-8');
        dbStore = { ...dbStore, ...JSON.parse(raw) };
        persistDB();
      } catch (err) {
        // ignore
      }
    }
  }
}

function persistDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbStore, null, 2), 'utf-8');
  } catch (err) {
    console.error('[DB] Error writing to db.json:', err.message);
  }
}

export function loadCharactersJSON() {
  try {
    if (fs.existsSync(CHARACTERS_FILE)) {
      const raw = fs.readFileSync(CHARACTERS_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('[DB] Error reading characters.json:', err.message);
  }
  return [];
}

export function saveCharactersJSON(characters) {
  try {
    fs.writeFileSync(CHARACTERS_FILE, JSON.stringify(characters, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[DB] Error writing to characters.json:', err.message);
    return false;
  }
}

export function initDB() {
  loadDB();
  console.log('[DB] ✅ Pure JSON Database initialized from:', DB_FILE);
  console.log('[DB] 📜 Character Catalog loaded from backend:', CHARACTERS_FILE);
  return true;
}

// Backward-compatible alias
export const connectDB = initDB;

export const repository = {
  // Characters (Pure JSON Storage in Backend)
  async getCharacters() {
    return loadCharactersJSON();
  },

  async getCharacterById(id) {
    const list = loadCharactersJSON();
    return list.find((c) => c.id === id) || null;
  },

  async saveCharacter(characterData) {
    const list = loadCharactersJSON();
    const existingIndex = list.findIndex((c) => c.id === characterData.id);
    if (existingIndex !== -1) {
      list[existingIndex] = { ...list[existingIndex], ...characterData };
    } else {
      list.push(characterData);
    }
    saveCharactersJSON(list);
    return characterData;
  },

  async updateCharacter(id, updates) {
    const list = loadCharactersJSON();
    const existingIndex = list.findIndex((c) => c.id === id);
    if (existingIndex === -1) return null;
    list[existingIndex] = { ...list[existingIndex], ...updates };
    saveCharactersJSON(list);
    return list[existingIndex];
  },

  // Config
  async getConfig() {
    const envPrice = process.env.V2_PREMIUM_PRICE;
    const envCurrency = process.env.V2_PREMIUM_CURRENCY || 'INR';

    const price = envPrice !== undefined && envPrice !== '' ? Number(envPrice) : dbStore.config.v2Price;
    const priceConfigured = envPrice !== '' && !isNaN(price);

    return {
      v2Price: priceConfigured ? price : null,
      currency: envCurrency,
      priceConfigured: priceConfigured
    };
  },

  async setPrice(price, currency = 'INR') {
    dbStore.config.v2Price = price;
    dbStore.config.currency = currency;
    dbStore.config.priceConfigured = price !== null && !isNaN(price);
    persistDB();
    return dbStore.config;
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

    dbStore.licenses.push(license);
    persistDB();
    return license;
  },

  async findLicenseByKey(key) {
    return dbStore.licenses.find((l) => l.licenseKey === key) || null;
  },

  async updateLicense(key, updates) {
    const idx = dbStore.licenses.findIndex((l) => l.licenseKey === key);
    if (idx !== -1) {
      dbStore.licenses[idx] = {
        ...dbStore.licenses[idx],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      persistDB();
      return dbStore.licenses[idx];
    }
    return null;
  },

  async getAllLicenses() {
    return [...dbStore.licenses].reverse();
  },

  // Orders
  async createOrder(data) {
    if (!dbStore.orders) dbStore.orders = [];
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
    dbStore.orders.push(order);
    persistDB();
    return order;
  },

  async findOrderById(orderId) {
    if (!dbStore.orders) dbStore.orders = [];
    return dbStore.orders.find((o) => o.orderId === orderId) || null;
  },

  async getAllOrders() {
    if (!dbStore.orders) dbStore.orders = [];
    return [...dbStore.orders].reverse();
  },

  async updateOrder(orderId, updates) {
    if (!dbStore.orders) dbStore.orders = [];
    const idx = dbStore.orders.findIndex((o) => o.orderId === orderId);
    if (idx !== -1) {
      dbStore.orders[idx] = {
        ...dbStore.orders[idx],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      persistDB();
      return dbStore.orders[idx];
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
    dbStore.payments.push(payment);
    persistDB();
    return payment;
  },

  async findPaymentByOrderId(orderId) {
    return dbStore.payments.find((p) => p.orderId === orderId) || null;
  },

  async findPaymentByPaymentId(paymentId) {
    return dbStore.payments.find((p) => p.paymentId === paymentId) || null;
  },

  async findPaymentByUtr(utr) {
    if (!utr) return null;
    return dbStore.payments.find((p) => p.utr === utr) || null;
  },

  // Protected Download Tokens
  async createDownloadToken(licenseKey) {
    const token =
      'SF_DL_' +
      Date.now() +
      '_' +
      Math.random().toString(36).substring(2, 12) +
      Math.random().toString(36).substring(2, 12);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes validity
    const record = {
      token,
      licenseKey,
      expiresAt,
      downloadsCount: 0,
      createdAt: new Date().toISOString()
    };
    dbStore.downloadTokens.push(record);
    persistDB();
    return record;
  },

  async verifyAndConsumeDownloadToken(token) {
    const record = dbStore.downloadTokens.find((t) => t.token === token);
    if (!record) return { valid: false, reason: 'TOKEN_NOT_FOUND' };

    if (new Date(record.expiresAt) < new Date()) {
      return { valid: false, reason: 'TOKEN_EXPIRED' };
    }

    record.downloadsCount += 1;
    record.lastDownloadedAt = new Date().toISOString();
    persistDB();
    return { valid: true, record };
  },

  // Contact Inquiries (Pure JSON Storage)
  async recordInquiry(data) {
    if (!dbStore.inquiries) dbStore.inquiries = [];
    const inquiry = {
      id: 'inq_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: data.name,
      email: data.email,
      topic: data.topic,
      message: data.message,
      createdAt: new Date().toISOString()
    };
    dbStore.inquiries.push(inquiry);
    persistDB();
    return inquiry;
  },

  async getInquiries() {
    return dbStore.inquiries || [];
  },

  // Customer Accounts (Login / Create Account)
  async createUser(data) {
    if (!dbStore.users) dbStore.users = [];
    const cleanEmail = String(data.email || '').toLowerCase().trim();
    let existing = dbStore.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      if (data.name && data.name.trim()) existing.name = data.name.trim();
      if (data.phone && data.phone.trim()) existing.phone = data.phone.trim();
      if (data.passwordHash) existing.passwordHash = data.passwordHash;
      persistDB();
      return existing;
    }
    const user = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: data.name || cleanEmail.split('@')[0] || 'Sacred Devotee',
      email: cleanEmail,
      phone: data.phone || '',
      passwordHash: data.passwordHash || '',
      createdAt: new Date().toISOString()
    };
    dbStore.users.push(user);
    persistDB();
    return user;
  },

  async findUserByEmail(email) {
    if (!dbStore.users) dbStore.users = [];
    const cleanEmail = String(email || '').toLowerCase().trim();
    return dbStore.users.find(u => u.email.toLowerCase() === cleanEmail) || null;
  },

  async authenticateUser(email, passwordHash) {
    const user = await this.findUserByEmail(email);
    if (!user) return null;
    return user;
  }
};
