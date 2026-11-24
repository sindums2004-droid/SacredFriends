import assert from 'assert';
import crypto from 'node:crypto';
import { repository, connectDB } from './storage/db.js';
import { getPublicConfig } from './controllers/configController.js';
import { checkV1Status } from './controllers/downloadController.js';
import {
  createOrder,
  handleYoupiWebhook,
  checkOrderStatus
} from './controllers/paymentController.js';
import {
  activateLicense,
  validateLicense,
  getLicenseStatus,
  getDownloadTokenForLicense,
  adminResetDevice,
  generateDemoLicense
} from './controllers/licenseController.js';

function mockReqRes(reqData = {}) {
  const req = {
    body: reqData.body || {},
    params: reqData.params || {},
    query: reqData.query || {},
    headers: reqData.headers || {},
    rawBody: reqData.rawBody || ''
  };

  let statusCode = 200;
  let responseData = null;

  const res = {
    status(code) {
      statusCode = code;
      return res;
    },
    json(data) {
      responseData = data;
      return res;
    },
    send(data) {
      responseData = data;
      return res;
    }
  };

  return { req, res, getStatus: () => statusCode, getData: () => responseData };
}

async function runUnitTests() {
  console.log('🧪 Starting Sacred Friends In-Memory Automated Integration Tests...\n');
  await connectDB();

  // Test 1: Config
  console.log('Test 1: Public Configuration & Pricing API');
  const t1 = mockReqRes();
  await getPublicConfig(t1.req, t1.res);
  assert.strictEqual(t1.getStatus(), 200);
  assert.strictEqual(t1.getData().product, 'Sacred Friends');
  assert.strictEqual(t1.getData().company, 'Q-CUBIC');
  assert.strictEqual(t1.getData().v2.price, 499);
  assert.strictEqual(t1.getData().v2.gateway, 'YouPI-PG');
  console.log(`  ✅ Config verified (Product: ${t1.getData().product}, Price: ₹${t1.getData().v2.price}, Gateway: ${t1.getData().v2.gateway})`);

  // Test 2: V1 Status
  console.log('Test 2: V1 Installer Status Check');
  const t2 = mockReqRes();
  await checkV1Status(t2.req, t2.res);
  assert.strictEqual(t2.getStatus(), 200);
  assert.strictEqual(t2.getData().available, true);
  console.log(`  ✅ V1 installer verified (${t2.getData().filename}, Size: ${t2.getData().sizeMB})`);

  // Test 3: Demo License Generation
  console.log('Test 3: Demo License Generation');
  const t3 = mockReqRes();
  await generateDemoLicense(t3.req, t3.res);
  assert.strictEqual(t3.getStatus(), 200);
  assert.ok(t3.getData().licenseKey.startsWith('SF2-'));
  const testKey = t3.getData().licenseKey;
  console.log(`  ✅ Demo License Generated: ${testKey}`);

  // Test 4: License Status Check
  console.log('Test 4: Customer Dashboard License Lookup');
  const t4 = mockReqRes({ params: { key: testKey } });
  await getLicenseStatus(t4.req, t4.res);
  assert.strictEqual(t4.getStatus(), 200);
  assert.strictEqual(t4.getData().licenseKey, testKey);
  assert.strictEqual(t4.getData().isDeviceBound, false);
  console.log(`  ✅ License status verified (Unassigned, ready for first Windows PC)`);

  // Test 5: First Device Activation
  console.log('Test 5: Device 1 Activation (Primary Windows 11 PC)');
  const t5 = mockReqRes({
    body: {
      licenseKey: testKey,
      deviceFingerprint: 'WIN-FINGERPRINT-DEV1-90F2',
      deviceName: 'Office Windows 11 Desktop'
    }
  });
  await activateLicense(t5.req, t5.res);
  assert.strictEqual(t5.getStatus(), 200);
  assert.strictEqual(t5.getData().status, 'ACTIVATED');
  console.log(`  ✅ Device 1 Activated: ${t5.getData().registeredDeviceName}`);

  // Test 6: Reinstallation on Same Device
  console.log('Test 6: Reinstallation / Heartbeat on Same Device');
  const t6 = mockReqRes({
    body: {
      licenseKey: testKey,
      deviceFingerprint: 'WIN-FINGERPRINT-DEV1-90F2'
    }
  });
  await validateLicense(t6.req, t6.res);
  assert.strictEqual(t6.getStatus(), 200);
  assert.strictEqual(t6.getData().valid, true);
  console.log(`  ✅ Reinstallation / Heartbeat Confirmed (Device: ${t6.getData().registeredDevice})`);

  // Test 7: Strict Rejection of Device 2 (1 Device Enforcement)
  console.log('Test 7: Strict Device 2 Rejection (Enforce 1 Payment = 1 User = 1 Device)');
  const t7 = mockReqRes({
    body: {
      licenseKey: testKey,
      deviceFingerprint: 'WIN-UNAUTHORIZED-DEVICE-2',
      deviceName: 'Unauthorized Friend Laptop'
    }
  });
  await activateLicense(t7.req, t7.res);
  assert.strictEqual(t7.getStatus(), 403);
  assert.strictEqual(t7.getData().error, 'DEVICE_MISMATCH');
  console.log(`  ✅ Unauthorized Device 2 Blocked: ${t7.getData().message.substring(0, 75)}...`);

  // Test 8: Authorized Download Token
  console.log('Test 8: Protected V2 Download Token Generation');
  const t8 = mockReqRes({ params: { key: testKey } });
  await getDownloadTokenForLicense(t8.req, t8.res);
  assert.strictEqual(t8.getStatus(), 200);
  assert.ok(t8.getData().downloadUrl.includes('/api/download/v2/authorized?token='));
  console.log(`  ✅ Download Token Generated: ${t8.getData().downloadUrl.substring(0, 50)}...`);

  // Test 9: Admin Device Reset
  console.log('Test 9: Admin Authorized Device Migration Reset');
  const t9 = mockReqRes({
    body: {
      licenseKey: testKey,
      adminSecretKey: 'sacred-friends-super-admin-secret-2026',
      reason: 'Customer bought a new Windows PC'
    }
  });
  await adminResetDevice(t9.req, t9.res);
  assert.strictEqual(t9.getStatus(), 200);
  assert.strictEqual(t9.getData().status, 'DEVICE_RESET_SUCCESSFUL');
  console.log(`  ✅ Device Binding Reset: ${t9.getData().message}`);

  // Test 10: Re-activate on New Device after Reset
  console.log('Test 10: Re-activation on New Hardware following Migration');
  const t10 = mockReqRes({
    body: {
      licenseKey: testKey,
      deviceFingerprint: 'WIN-NEW-PC-FINGERPRINT-2026',
      deviceName: 'New Upgraded Workstation'
    }
  });
  await activateLicense(t10.req, t10.res);
  assert.strictEqual(t10.getStatus(), 200);
  assert.strictEqual(t10.getData().status, 'ACTIVATED');
  console.log(`  ✅ Successfully migrated and activated on: ${t10.getData().registeredDeviceName}`);

  // Test 11: Order Creation via YouPI-PG
  console.log('Test 11: Order Creation');
  const t11 = mockReqRes({
    body: {
      customerName: 'Sita Devotee',
      customerEmail: 'sita@example.com'
    }
  });
  await createOrder(t11.req, t11.res);
  assert.strictEqual(t11.getStatus(), 200);
  assert.ok(t11.getData().orderId);
  const newOrderId = t11.getData().orderId;
  console.log(`  ✅ Order Created: ${newOrderId} (Amount: ₹${t11.getData().displayAmount})`);

  console.log('\n🎉 ALL 11 IN-MEMORY INTEGRATION TESTS PASSED WITH 100% SUCCESS!\n');
}

runUnitTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

