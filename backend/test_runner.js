import http from 'http';
import assert from 'assert';
import crypto from 'node:crypto';
import app from './server.js';
import { connectDB } from './storage/db.js';

console.log('🧪 Starting Sacred Friends Backend & Licensing Automated Test Suite...\n');

let activePort = 5000;

async function request(path, options = {}) {
  const url = `http://127.0.0.1:${activePort}${path}`;
  const method = options.method || 'GET';
  const headers = options.headers || {};
  let body = options.body;

  if (body && typeof body === 'object') {
    body = JSON.stringify(body);
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, { method, headers, body });
  const contentType = res.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }
  return { status: res.status, headers: res.headers, data };
}

async function runTests() {
  let server = null;

  try {
    await connectDB();
    server = app.listen(0);
    activePort = server.address().port;
    console.log(`[Runner] In-process server listening on port ${activePort}.\n`);

    console.log('Test 1: Health check');
    const health = await request('/health');
    assert.strictEqual(health.status, 200);
    console.log('  ✅ /health passed');

    console.log('Test 2: Public Configuration & Pricing API');
    const configRes = await request('/api/config');
    assert.strictEqual(configRes.status, 200);
    assert.strictEqual(configRes.data.product, 'Sacred Friends');
    assert.strictEqual(configRes.data.company, 'Q-CUBIC');
    assert.strictEqual(configRes.data.v1.isAvailable, true);
    assert.strictEqual(configRes.data.v2.price, 499);
    console.log(`  ✅ /api/config passed (V1 Available: ${configRes.data.v1.isAvailable}, V2 Price: INR ${configRes.data.v2.price})`);

    console.log('Test 3: V1 Installer Status Check');
    const v1Status = await request('/api/download/v1/status');
    assert.strictEqual(v1Status.status, 200);
    assert.strictEqual(v1Status.data.available, true);
    assert.strictEqual(v1Status.data.filename, 'SacredFriends-V1-Free-Setup.exe');
    console.log(`  ✅ V1 installer verified (${v1Status.data.filename}, Size: ${v1Status.data.sizeMB})`);

    console.log('Test 4: Payment Order Creation (Razorpay / Test)');
    const orderRes = await request('/api/payment/create-order', {
      method: 'POST',
      body: { customerName: 'Arjun Verma', customerEmail: 'arjun@example.com' }
    });
    assert.strictEqual(orderRes.status, 200);
    assert.ok(orderRes.data.orderId, 'Order ID must exist');
    assert.strictEqual(orderRes.data.displayAmount, 499);
    const orderId = orderRes.data.orderId;
    console.log(`  ✅ Order created: ${orderId} (Amount: ₹${orderRes.data.displayAmount})`);

    console.log('Test 5: Payment Signature Verification & License Generation');
    const verifyRes = await request('/api/payment/verify', {
      method: 'POST',
      body: {
        razorpay_order_id: orderId,
        razorpay_payment_id: `pay_test_${Date.now()}`,
        razorpay_signature: 'test_signature_mock_valid',
        customerName: 'Arjun Verma',
        customerEmail: 'arjun@example.com'
      }
    });
    assert.strictEqual(verifyRes.status, 200);
    assert.strictEqual(verifyRes.data.success, true);
    assert.ok(verifyRes.data.licenseKey.startsWith('SF2-'), 'License key format invalid');
    assert.ok(verifyRes.data.downloadUrl, 'Download URL required');
    const testLicenseKey = verifyRes.data.licenseKey;
    const validToken = verifyRes.data.downloadUrl.split('token=')[1];
    console.log(`  ✅ Payment verified! Generated License Key: ${testLicenseKey}`);
    console.log(`  ✅ Protected Download Link: ${verifyRes.data.downloadUrl}`);

    console.log('Test 6: Protected V2 Installer Download Stream with Token');
    const downloadRes = await request(`/api/download/v2/authorized?token=${validToken}`);
    assert.strictEqual(downloadRes.status, 200);
    assert.ok(
      downloadRes.headers.get('content-disposition')?.includes('SacredFriends-V2-Paid-Setup.exe'),
      'Content-Disposition must name the paid installer'
    );
    console.log('  ✅ Protected download streamed successfully with valid Content-Disposition.');

    console.log('Test 7: Reject Protected Download with Tampered / Missing Token');
    const badDownloadRes = await request('/api/download/v2/authorized?token=TAMPERED_INVALID_TOKEN');
    assert.strictEqual(badDownloadRes.status, 403);
    console.log('  ✅ Tampered token correctly rejected with HTTP 403 Forbidden.');

    console.log('Test 8: Strict 1-Device Policy — First Activation on Device 1');
    const device1Fingerprint = 'WIN-RIG-DEV1-9874-A';
    const act1 = await request('/api/license/activate', {
      method: 'POST',
      body: {
        licenseKey: testLicenseKey,
        deviceFingerprint: device1Fingerprint,
        deviceName: "Arjun's Primary Dev Rig"
      }
    });
    assert.strictEqual(act1.status, 200);
    assert.strictEqual(act1.data.status, 'ACTIVATED');
    console.log(`  ✅ Device 1 activated: ${act1.data.registeredDeviceName}`);

    console.log('Test 9: Reinstallation on SAME Device 1 (Allowed without re-purchase)');
    const act1Reinstall = await request('/api/license/activate', {
      method: 'POST',
      body: {
        licenseKey: testLicenseKey,
        deviceFingerprint: device1Fingerprint,
        deviceName: "Arjun's Primary Dev Rig"
      }
    });
    assert.strictEqual(act1Reinstall.status, 200);
    assert.strictEqual(act1Reinstall.data.status, 'REINSTALLED_OK');
    console.log('  ✅ Reinstallation on same registered device verified.');

    console.log('Test 10: Strict Rejection of Unauthorized Device 2');
    const device2Fingerprint = 'WIN-LAPTOP-DEV2-5512-B';
    const act2Unauthorized = await request('/api/license/activate', {
      method: 'POST',
      body: {
        licenseKey: testLicenseKey,
        deviceFingerprint: device2Fingerprint,
        deviceName: 'Unauthorized Second Laptop'
      }
    });
    assert.strictEqual(act2Unauthorized.status, 403);
    assert.strictEqual(act2Unauthorized.data.error, 'DEVICE_MISMATCH');
    assert.strictEqual(
      act2Unauthorized.data.message,
      'This Sacred Friends Premium license is already registered to another device. Only the original purchaser can use this license on their registered device. Please contact support if you need assistance.'
    );
    console.log('  ✅ Unauthorized Device 2 strictly rejected with exact prompt-mandated message:');
    console.log(`     "${act2Unauthorized.data.message}"`);

    console.log('Test 11: Admin Device Reset');
    const resetRes = await request('/api/admin/reset-device', {
      method: 'POST',
      body: {
        licenseKey: testLicenseKey,
        adminSecretKey: process.env.ADMIN_SECRET_KEY || 'sacred-friends-super-admin-secret-2026',
        reason: 'Authorized migration to upgraded workstation'
      }
    });
    assert.strictEqual(resetRes.status, 200);
    assert.strictEqual(resetRes.data.success, true);
    console.log('  ✅ Administrator device reset succeeded.');

    console.log('Test 12: Device 2 Activation after Authorized Admin Reset');
    const act2AfterReset = await request('/api/license/activate', {
      method: 'POST',
      body: {
        licenseKey: testLicenseKey,
        deviceFingerprint: device2Fingerprint,
        deviceName: 'New Upgraded Workstation'
      }
    });
    assert.strictEqual(act2AfterReset.status, 200);
    assert.strictEqual(act2AfterReset.data.status, 'ACTIVATED');
    console.log('  ✅ New workstation successfully activated following authorized reset.');

    console.log('\n--- YOUPI-PG PAYMENT GATEWAY INTEGRATION TESTS ---');

    console.log('Test 13: YouPI-PG Order Creation');
    const youpiOrderRes = await request('/api/payment/create-order', {
      method: 'POST',
      body: { customerName: 'Priya Sharma', customerEmail: 'priya@example.com' }
    });
    assert.strictEqual(youpiOrderRes.status, 200);
    assert.ok(youpiOrderRes.data.orderId, 'Order ID must exist');
    assert.strictEqual(youpiOrderRes.data.displayAmount, 499);
    assert.strictEqual(youpiOrderRes.data.currency, 'INR');
    const youpiOrderId = youpiOrderRes.data.orderId;
    console.log(`  ✅ YouPI-PG Order created: ${youpiOrderId} (Amount: ₹${youpiOrderRes.data.displayAmount})`);
    if (youpiOrderRes.data.checkoutUrl) {
      console.log(`  ✅ Authentic YouPI-PG Checkout URL: ${youpiOrderRes.data.checkoutUrl}`);
    }

    console.log('Test 14: YouPI-PG Webhook Rejection with Forged Signature');
    const webhookSecret = process.env.YOUPI_WEBHOOK_SECRET || 'd86590211edbe497f040a7b0f4e639527151a414a7fd7f8754bdd4d845ca1d1a';
    const fakeWebhookPayload = JSON.stringify({
      event: 'payment.success',
      data: {
        paymentId: 'pay_youpi_fake_123',
        orderId: youpiOrderId,
        status: 'SUCCESS'
      }
    });
    const badSigRes = await request('/api/payment/youpi-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Gateway-Signature': 'sha256=forged_bad_signature_abcdef1234567890'
      },
      body: fakeWebhookPayload
    });
    assert.strictEqual(badSigRes.status, 401);
    assert.strictEqual(badSigRes.data.error, 'INVALID_SIGNATURE');
    console.log('  ✅ Forged YouPI webhook signature correctly rejected with HTTP 401.');

    console.log('Test 15: YouPI-PG Webhook Verification & License Provisioning');
    const authenticPayload = JSON.stringify({
      event: 'SUCCESS',
      orderId: youpiOrderId,
      amount: 499,
      amountPaise: 49900,
      currency: 'INR',
      utr: 'UTR987654321012'
    });
    const authenticHmac = crypto
      .createHmac('sha256', webhookSecret)
      .update(authenticPayload)
      .digest('hex');

    const validWebhookRes = await request('/api/payment/youpi-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Gateway-Signature': `sha256=${authenticHmac}`
      },
      body: authenticPayload
    });
    assert.strictEqual(validWebhookRes.status, 200);
    assert.strictEqual(validWebhookRes.data.success, true);
    assert.strictEqual(validWebhookRes.data.licenseIssued, true);
    assert.ok(validWebhookRes.data.licenseKey?.startsWith('SF2-'), 'Valid license key must be generated on webhook');
    const youpiGeneratedKey = validWebhookRes.data.licenseKey;
    console.log(`  ✅ Authentic YouPI-PG Webhook processed! License Provisioned: ${youpiGeneratedKey}`);

    console.log('Test 16: YouPI-PG Order Status Polling Endpoint');
    const statusRes = await request(`/api/payment/status/${encodeURIComponent(youpiOrderId)}`);
    assert.strictEqual(statusRes.status, 200);
    assert.strictEqual(statusRes.data.status, 'SUCCESS');
    assert.strictEqual(statusRes.data.licenseKey, youpiGeneratedKey);
    assert.ok(statusRes.data.downloadUrl, 'Must include authorized download URL');
    console.log(`  ✅ Status confirmed: ${statusRes.data.status} (License: ${statusRes.data.licenseKey})`);

    console.log('\n🎉 ALL 16 AUTOMATED INTEGRATION TESTS PASSED WITH 100% SUCCESS!\n');
  } catch (err) {
    console.error('\n❌ Test failure:', err);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
  }
}

runTests();
