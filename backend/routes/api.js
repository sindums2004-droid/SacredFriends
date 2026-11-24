import express from 'express';
import {
  createOrder,
  verifyPayment,
  handleYoupiWebhook,
  checkOrderStatus,
  submitUtr,
  simulatePaymentSuccess
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

const router = express.Router();

// Configuration
router.get('/config', getPublicConfig);

// Downloads
router.get('/download/v1', downloadV1);
router.get('/download/v1/status', checkV1Status);
router.get('/download/v2/authorized', downloadV2Authorized);

// Payment & Orders (YouPI-PG Gateway Integration)
router.post('/payment/create-order', createOrder);
router.post('/payment/verify', verifyPayment);
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

export default router;

