import crypto from 'crypto';
import { repository } from '../storage/db.js';

/**
 * Generate a valid demo license key for testing
 */
export async function generateDemoLicense(req, res) {
  try {
    const segment = () => crypto.randomBytes(2).toString('hex').toUpperCase();
    const licenseKey = `SF2-${segment()}-${segment()}-${segment()}-${segment()}`;
    const license = await repository.createLicense({
      licenseKey,
      customerName: 'Demo Devotee',
      customerEmail: 'demo@example.com',
      paymentId: 'pay_demo_' + Date.now(),
      orderId: 'order_demo_' + Date.now(),
      amount: 499,
      currency: 'INR'
    });
    return res.status(200).json({ success: true, licenseKey: license.licenseKey });
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: error.message });
  }
}

/**
 * Activate a license on a Windows Desktop device
 * Enforces: ONE PAYMENT = ONE PURCHASER = ONE USER = ONE WINDOWS DEVICE.
 */
export async function activateLicense(req, res) {
  try {
    const { licenseKey, deviceFingerprint, deviceName } = req.body;

    if (!licenseKey || !deviceFingerprint) {
      return res.status(400).json({
        error: 'MISSING_ACTIVATION_PARAMETERS',
        message: 'License key and device hardware fingerprint are required for desktop activation.'
      });
    }

    const cleanKey = licenseKey.trim();
    const cleanDevice = deviceFingerprint.trim();
    const cleanDeviceName = (deviceName || 'Windows PC').trim();

    const license = await repository.findLicenseByKey(cleanKey);

    if (!license) {
      return res.status(404).json({
        error: 'LICENSE_NOT_FOUND',
        message: 'Invalid license key. Please check your purchase confirmation or contact support.'
      });
    }

    if (license.status === 'revoked') {
      return res.status(403).json({
        error: 'LICENSE_REVOKED',
        message: 'This Sacred Friends Premium license has been revoked. Please contact support.'
      });
    }

    // CASE 1: License has not yet been registered to any device (First Activation)
    if (!license.registeredDeviceId) {
      const updated = await repository.updateLicense(cleanKey, {
        registeredDeviceId: cleanDevice,
        registeredDeviceName: cleanDeviceName,
        activatedAt: new Date().toISOString(),
        lastValidatedAt: new Date().toISOString(),
        validationCount: 1
      });

      console.log(`[License] Key ${cleanKey} activated for device ${cleanDevice} (${cleanDeviceName})`);

      return res.status(200).json({
        success: true,
        status: 'ACTIVATED',
        message: 'License successfully activated for your Windows device.',
        licenseKey: updated.licenseKey,
        customerName: updated.customerName,
        registeredDeviceName: cleanDeviceName,
        activatedAt: updated.activatedAt
      });
    }

    // CASE 2: Same registered device re-activating / reinstalling
    if (license.registeredDeviceId === cleanDevice) {
      const updated = await repository.updateLicense(cleanKey, {
        lastValidatedAt: new Date().toISOString(),
        validationCount: (license.validationCount || 0) + 1
      });

      console.log(`[License] Key ${cleanKey} re-verified for registered device ${cleanDevice}`);

      return res.status(200).json({
        success: true,
        status: 'REINSTALLED_OK',
        message: 'License re-verified successfully for your registered Windows device.',
        licenseKey: updated.licenseKey,
        customerName: updated.customerName,
        registeredDeviceName: license.registeredDeviceName || cleanDeviceName,
        activatedAt: license.activatedAt
      });
    }

    // CASE 3: Different device attempting to use the license -> STRICT REJECTION
    console.warn(`[License] Device mismatch for key ${cleanKey}. Registered: ${license.registeredDeviceId}, Attempted: ${cleanDevice}`);

    return res.status(403).json({
      error: 'DEVICE_MISMATCH',
      message: 'This Sacred Friends Premium license is already registered to another device. Only the original purchaser can use this license on their registered device. Please contact support if you need assistance.'
    });
  } catch (error) {
    console.error('[License] Activation exception:', error);
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'An internal server error occurred while processing license activation.'
    });
  }
}

/**
 * Validate active status for registered device (Heartbeat/Startup check)
 */
export async function validateLicense(req, res) {
  try {
    const { licenseKey, deviceFingerprint } = req.body;

    if (!licenseKey || !deviceFingerprint) {
      return res.status(400).json({
        error: 'MISSING_VALIDATION_PARAMETERS',
        message: 'License key and device hardware fingerprint are required.'
      });
    }

    const cleanKey = licenseKey.trim();
    const cleanDevice = deviceFingerprint.trim();

    const license = await repository.findLicenseByKey(cleanKey);

    if (!license) {
      return res.status(404).json({
        valid: false,
        error: 'LICENSE_NOT_FOUND',
        message: 'License key not found.'
      });
    }

    if (license.status !== 'active') {
      return res.status(403).json({
        valid: false,
        error: 'LICENSE_INACTIVE',
        message: `License is currently ${license.status}.`
      });
    }

    if (license.registeredDeviceId !== cleanDevice) {
      return res.status(403).json({
        valid: false,
        error: 'DEVICE_MISMATCH',
        message: 'This Sacred Friends Premium license is already registered to another device. Only the original purchaser can use this license on their registered device. Please contact support if you need assistance.'
      });
    }

    await repository.updateLicense(cleanKey, {
      lastValidatedAt: new Date().toISOString(),
      validationCount: (license.validationCount || 0) + 1
    });

    return res.status(200).json({
      valid: true,
      licenseKey: license.licenseKey,
      customerName: license.customerName,
      registeredDevice: license.registeredDeviceName,
      activatedAt: license.activatedAt
    });
  } catch (error) {
    console.error('[License] Validation exception:', error);
    return res.status(500).json({
      valid: false,
      error: 'SERVER_ERROR',
      message: 'License validation error.'
    });
  }
}

/**
 * Get public license status (for checking before install)
 */
export async function getLicenseStatus(req, res) {
  try {
    const { key } = req.params;
    if (!key) {
      return res.status(400).json({ error: 'KEY_REQUIRED' });
    }

    const license = await repository.findLicenseByKey(key.trim());
    if (!license) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'License key not found.' });
    }

    return res.status(200).json({
      licenseKey: license.licenseKey,
      customerName: license.customerName || 'Sacred Friends Devotee',
      customerEmail: license.customerEmail || 'customer@example.com',
      status: license.status,
      isDeviceBound: !!license.registeredDeviceId,
      registeredDeviceId: license.registeredDeviceId || null,
      registeredDeviceName: license.registeredDeviceName || null,
      activatedAt: license.activatedAt || null,
      createdAt: license.createdAt
    });
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: error.message });
  }
}

/**
 * Generate a fresh short-lived download token for an active license
 * GET /api/license/download-token/:key
 */
export async function getDownloadTokenForLicense(req, res) {
  try {
    const { key } = req.params;
    if (!key) {
      return res.status(400).json({ error: 'KEY_REQUIRED', message: 'License key is required.' });
    }

    const license = await repository.findLicenseByKey(key.trim());
    if (!license) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'License key not found.' });
    }

    if (license.status !== 'active') {
      return res.status(403).json({ error: 'LICENSE_INACTIVE', message: `License is ${license.status}.` });
    }

    const tokenRecord = await repository.createDownloadToken(license.licenseKey);
    return res.status(200).json({
      success: true,
      downloadUrl: `/api/download/v2/authorized?token=${tokenRecord.token}`,
      expiresAt: tokenRecord.expiresAt
    });
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: error.message });
  }
}

/**
 * Administrator Reset Device Binding
 * Resets the registered device so the purchaser can move their license to a new PC
 */
export async function adminResetDevice(req, res) {
  try {
    const { licenseKey, adminSecretKey, reason } = req.body;
    const requiredSecret = process.env.ADMIN_SECRET_KEY || 'sacred-friends-super-admin-secret-2026';

    if (!adminSecretKey || adminSecretKey !== requiredSecret) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Invalid administrator credentials.'
      });
    }

    if (!licenseKey) {
      return res.status(400).json({
        error: 'LICENSE_KEY_REQUIRED',
        message: 'License key is required to perform device reset.'
      });
    }

    const license = await repository.findLicenseByKey(licenseKey.trim());
    if (!license) {
      return res.status(404).json({
        error: 'LICENSE_NOT_FOUND',
        message: 'License key not found.'
      });
    }

    const previousDevice = license.registeredDeviceId;
    const previousDeviceName = license.registeredDeviceName;

    const updated = await repository.updateLicense(licenseKey.trim(), {
      registeredDeviceId: null,
      registeredDeviceName: null,
      activatedAt: null,
      resetReason: reason || 'Customer requested hardware upgrade'
    });

    console.log(`[Admin] Reset device binding for ${licenseKey}. (Prev: ${previousDeviceName})`);

    return res.status(200).json({
      success: true,
      status: 'DEVICE_RESET_SUCCESSFUL',
      message: 'Device registration successfully reset. The license can now be activated on a new device.',
      licenseKey: updated.licenseKey,
      previousDevice: previousDeviceName || previousDevice
    });
  } catch (error) {
    console.error('[Admin] Reset device exception:', error);
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Internal error resetting device.'
    });
  }
}

/**
 * Administrator List All Licenses
 */
export async function adminListLicenses(req, res) {
  try {
    const adminKey = req.headers['x-admin-secret'] || req.query.adminSecretKey;
    const requiredSecret = process.env.ADMIN_SECRET_KEY || 'sacred-friends-super-admin-secret-2026';

    if (!adminKey || adminKey !== requiredSecret) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }

    const licenses = await repository.getAllLicenses();
    return res.status(200).json({ success: true, count: licenses.length, licenses });
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: error.message });
  }
}

