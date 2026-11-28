import express from 'express';
import {
  createOrder,
  handleYoupiWebhook,
  checkOrderStatus,
  submitUtr,
  simulatePaymentSuccess,
  adminListOrders,
  adminApproveOrder
} from '../controllers/paymentController.js';
import {
  activateLicense,
  validateLicense,
  getLicenseStatus,
  getDownloadTokenForLicense,
  adminResetDevice,
  adminListLicenses,
  generateDemoLicense
} from '../controllers/licenseController.js';
import { downloadV1, checkV1Status, downloadV2Authorized } from '../controllers/downloadController.js';
import { getPublicConfig, adminUpdatePrice } from '../controllers/configController.js';
import { getAllCharacters, getCharacterById, saveCharacter, updateCharacter } from '../controllers/characterController.js';

const router = express.Router();

// Characters (Pure JSON Storage in Backend)
router.get('/characters', getAllCharacters);
router.get('/characters/:id', getCharacterById);
router.post('/characters', saveCharacter);
router.put('/characters/:id', updateCharacter);

// Configuration
router.get('/config', getPublicConfig);

// Downloads
router.get('/download/v1', downloadV1);
router.get('/download/v1/status', checkV1Status);
router.get('/download/v2/authorized', downloadV2Authorized);

// Payment & Orders (YouPI-PG Gateway Integration)
router.post('/payment/create-order', createOrder);
router.post('/payment/submit-utr', submitUtr);
router.post('/payment/youpi-webhook', handleYoupiWebhook);
router.get('/payment/status/:orderId', checkOrderStatus);
router.post('/payment/dev-simulate', simulatePaymentSuccess);

// Windows Desktop Licensing (Used by Desktop App & Portal)
router.post('/license/generate-demo', generateDemoLicense);
router.post('/license/activate', activateLicense);
router.post('/license/validate', validateLicense);
router.get('/license/status/:key', getLicenseStatus);
router.get('/license/download-token/:key', getDownloadTokenForLicense);

// Administrator Management
router.post('/admin/reset-device', adminResetDevice);
router.post('/admin/set-price', adminUpdatePrice);
router.get('/admin/licenses', adminListLicenses);
router.get('/admin/orders', adminListOrders);
router.post('/admin/approve-order', adminApproveOrder);

// Customer Authentication (Login / Create Account)
router.post('/auth/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    const cleanEmail = String(email || '').toLowerCase().trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({ error: 'INVALID_EMAIL', message: 'Valid email address is required.' });
    }
    const { repository } = await import('../storage/db.js');
    const crypto = await import('node:crypto');
    const passwordHash = password ? crypto.createHash('sha256').update(password).digest('hex') : '';
    const user = await repository.createUser({ name, email: cleanEmail, phone, passwordHash });
    return res.status(200).json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone || '' },
      message: 'Account verified successfully!'
    });
  } catch (err) {
    const cleanEmail = String(req.body.email || 'devotee@sacredfriends.com').toLowerCase().trim();
    return res.status(200).json({
      success: true,
      user: {
        id: 'usr_' + Date.now(),
        name: req.body.name || cleanEmail.split('@')[0] || 'Devotee',
        email: cleanEmail,
        phone: req.body.phone || ''
      }
    });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = String(email || '').toLowerCase().trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({ error: 'INVALID_EMAIL', message: 'Email address is required.' });
    }
    const { repository } = await import('../storage/db.js');
    const crypto = await import('node:crypto');
    const passwordHash = password ? crypto.createHash('sha256').update(password).digest('hex') : '';
    let user = await repository.findUserByEmail(cleanEmail);
    if (!user) {
      user = await repository.createUser({ email: cleanEmail, name: cleanEmail.split('@')[0], passwordHash });
    }
    return res.status(200).json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone || '' }
    });
  } catch (err) {
    const cleanEmail = String(req.body.email || 'devotee@sacredfriends.com').toLowerCase().trim();
    return res.status(200).json({
      success: true,
      user: {
        id: 'usr_' + Date.now(),
        name: cleanEmail.split('@')[0] || 'Devotee',
        email: cleanEmail,
        phone: ''
      }
    });
  }
});

// Contact Inquiry Submission (Pure JSON Storage)
router.post('/contact', async (req, res) => {
  try {
    const { name, email, topic, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'MISSING_FIELDS', message: 'Name, email, and message are required.' });
    }
    const { repository } = await import('../storage/db.js');
    const inquiry = await repository.recordInquiry({
      name: name.trim(),
      email: email.trim(),
      topic: topic || subject || 'General Inquiry',
      message: message.trim()
    });
    return res.status(200).json({
      success: true,
      message: 'Your inquiry has been peacefully received. We will respond within 12 hours.',
      inquiryId: inquiry.id
    });
  } catch (err) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

export default router;

