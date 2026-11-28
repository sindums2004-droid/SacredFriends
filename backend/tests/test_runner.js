import assert from 'assert';
import app from '../server.js';
import { connectDB } from '../storage/db.js';

console.log('🧪 Starting Sacred Friends Unified Backend & Licensing Test Suite...\n');

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

    console.log('Test 4: Character JSON Storage API (No SQLite/MongoDB)');
    const charsRes = await request('/api/characters');
    assert.strictEqual(charsRes.status, 200);
    assert.strictEqual(charsRes.data.success, true);
    assert.strictEqual(charsRes.data.count, 15);
    assert.ok(Array.isArray(charsRes.data.characters), 'Characters must be an array');
    console.log(`  ✅ Character JSON storage verified (${charsRes.data.count} companions loaded from characters.json)`);

    console.log('Test 5: Character JSON Storage - Single Character Query');
    const singleCharRes = await request('/api/characters/krishna');
    assert.strictEqual(singleCharRes.status, 200);
    assert.strictEqual(singleCharRes.data.success, true);
    assert.strictEqual(singleCharRes.data.character.name, 'Krishna');
    console.log(`  ✅ Single character query verified (${singleCharRes.data.character.name}: ${singleCharRes.data.character.title})`);

    console.log('Test 5b: Character JSON Storage - Save/Update to backend JSON file');
    const updateCharRes = await request('/api/characters/krishna', {
      method: 'PUT',
      body: { title: 'The Divine Flute Charmer & Cowherd Prince' }
    });
    assert.strictEqual(updateCharRes.status, 200);
    assert.strictEqual(updateCharRes.data.success, true);
    assert.strictEqual(updateCharRes.data.character.title, 'The Divine Flute Charmer & Cowherd Prince');

    // Restore original title
    await request('/api/characters/krishna', {
      method: 'PUT',
      body: { title: 'The Playful Lord & Flute Charmer' }
    });
    console.log('  ✅ Backend JSON save & update verified in backend/data/characters.json');

    console.log('Test 5c: Contact Inquiry Submission (Pure JSON Storage)');
    const contactRes = await request('/api/contact', {
      method: 'POST',
      body: {
        name: 'Vedic Devotee',
        email: 'devotee@example.com',
        topic: 'Windows Setup',
        message: 'Wishing to inquire about running Sacred Friends on dual monitors.'
      }
    });
    assert.strictEqual(contactRes.status, 200);
    assert.strictEqual(contactRes.data.success, true);
    assert.ok(contactRes.data.inquiryId, 'Inquiry ID must exist');
    console.log(`  ✅ Contact inquiry received and persisted: ${contactRes.data.inquiryId}`);

    console.log('Test 4: Demo License Generation');
    const demoRes = await request('/api/license/generate-demo', { method: 'POST' });
    assert.strictEqual(demoRes.status, 200);
    assert.ok(demoRes.data.licenseKey.startsWith('SF2-'));
    console.log(`  ✅ Demo License Generated: ${demoRes.data.licenseKey}`);

    console.log('Test 5: YouPI-PG Order Creation');
    const orderRes = await request('/api/payment/create-order', {
      method: 'POST',
      body: { customerName: 'Arjun Verma', customerEmail: 'arjun@example.com' }
    });
    assert.strictEqual(orderRes.status, 200);
    assert.ok(orderRes.data.orderId, 'Order ID must exist');
    assert.strictEqual(orderRes.data.displayAmount, 499);
    const orderId = orderRes.data.orderId;
    console.log(`  ✅ Order created: ${orderId} (Amount: ₹${orderRes.data.displayAmount}, Gateway: ${orderRes.data.gateway})`);

    console.log('Test 6: YouPI Payment Simulation & License Generation');
    const simRes = await request('/api/payment/dev-simulate', {
      method: 'POST',
      body: { orderId }
    });
    assert.strictEqual(simRes.status, 200);
    assert.strictEqual(simRes.data.success, true);
    assert.ok(simRes.data.licenseKey.startsWith('SF2-'), 'License key format invalid');
    const testLicenseKey = simRes.data.licenseKey;
    const downloadToken = simRes.data.token || (simRes.data.downloadUrl ? simRes.data.downloadUrl.split('token=')[1] : null);
    console.log(`  ✅ Payment fulfilled! Generated License Key: ${testLicenseKey}`);

    console.log('Test 7: YouPI Order Status Polling');
    const pollRes = await request(`/api/payment/status/${orderId}`);
    assert.strictEqual(pollRes.status, 200);
    assert.ok(pollRes.data.status === 'SUCCESS' || pollRes.data.status === 'LICENSE_GENERATED', `Status should indicate success, got: ${pollRes.data.status}`);
    assert.strictEqual(pollRes.data.licenseKey, testLicenseKey);
    console.log(`  ✅ Order status verified: ${pollRes.data.status}`);

    if (downloadToken) {
      console.log('Test 8: Protected V2 Installer Download Stream with Token');
      const downloadRes = await request(`/api/download/v2/authorized?token=${downloadToken}`);
      assert.strictEqual(downloadRes.status, 200);
      assert.ok(
        downloadRes.headers.get('content-disposition')?.includes('SacredFriends-V2-Paid-Setup.exe'),
        'Content-Disposition must name the paid installer'
      );
      console.log('  ✅ Authorized V2 download stream verified with cryptographic token');
    }

    console.log('Test 9: Customer Dashboard License Lookup');
    const lookupRes = await request(`/api/license/status/${testLicenseKey}`);
    assert.strictEqual(lookupRes.status, 200);
    assert.strictEqual(lookupRes.data.licenseKey, testLicenseKey);
    assert.strictEqual(lookupRes.data.isDeviceBound, false);
    console.log(`  ✅ Dashboard lookup verified (Ready for device activation)`);

    console.log('Test 10: Device 1 Activation (Primary Windows 11 PC)');
    const actRes1 = await request('/api/license/activate', {
      method: 'POST',
      body: {
        licenseKey: testLicenseKey,
        deviceFingerprint: 'WIN-DESKTOP-DEV1-A9F4-SECURE',
        deviceName: 'Office Windows 11 Desktop'
      }
    });
    assert.strictEqual(actRes1.status, 200);
    assert.strictEqual(actRes1.data.status, 'ACTIVATED');
    assert.strictEqual(actRes1.data.registeredDeviceId, 'WIN-DESKTOP-DEV1-A9F4-SECURE');
    console.log(`  ✅ Device 1 activated successfully: ${actRes1.data.registeredDeviceId}`);

    console.log('Test 11: Validation on Authorized Device');
    const valRes = await request('/api/license/validate', {
      method: 'POST',
      body: {
        licenseKey: testLicenseKey,
        deviceFingerprint: 'WIN-DESKTOP-DEV1-A9F4-SECURE'
      }
    });
    assert.strictEqual(valRes.status, 200);
    assert.strictEqual(valRes.data.valid, true);
    console.log('  ✅ Validation passed on authorized hardware fingerprint');

    console.log('Test 12: Unauthorized Rogue Device 2 Hardware Lock Rejection');
    const actRes2 = await request('/api/license/activate', {
      method: 'POST',
      body: {
        licenseKey: testLicenseKey,
        deviceFingerprint: 'WIN-UNAUTHORIZED-LAPTOP-DEV2',
        deviceName: 'Secondary Laptop'
      }
    });
    assert.strictEqual(actRes2.status, 403);
    assert.strictEqual(actRes2.data.error, 'DEVICE_MISMATCH');
    console.log(`  ✅ Hardware enforcement active: Second device rejected (HTTP 403 DEVICE_MISMATCH)`);

    console.log('Test 13: Admin Device Reset via Secret Key');
    const adminKey = process.env.ADMIN_SECRET_KEY || 'sacred-friends-super-admin-secret-2026';
    const resetRes = await request('/api/admin/reset-device', {
      method: 'POST',
      headers: { 'x-admin-key': adminKey },
      body: {
        licenseKey: testLicenseKey,
        reason: 'Customer migrated to a new Windows 11 workstation'
      }
    });
    assert.strictEqual(resetRes.status, 200);
    assert.strictEqual(resetRes.data.success, true);
    console.log('  ✅ Device lock cleared by administrator');

    console.log('Test 14: Re-activation on Device 2 After Authorized Reset');
    const actRes3 = await request('/api/license/activate', {
      method: 'POST',
      body: {
        licenseKey: testLicenseKey,
        deviceFingerprint: 'WIN-UNAUTHORIZED-LAPTOP-DEV2',
        deviceName: 'New Upgraded Workstation'
      }
    });
    assert.strictEqual(actRes3.status, 200);
    assert.strictEqual(actRes3.data.status, 'ACTIVATED');
    assert.strictEqual(actRes3.data.registeredDeviceId, 'WIN-UNAUTHORIZED-LAPTOP-DEV2');
    console.log(`  ✅ License successfully bound to replacement device: ${actRes3.data.registeredDeviceId}`);

    console.log('Test 15: Security Check - Invalid Token Download Stream Block');
    const fakeDownloadRes = await request('/api/download/v2/authorized?token=fake_tampered_token');
    assert.strictEqual(fakeDownloadRes.status, 403);
    console.log('  ✅ Tampered download token blocked (HTTP 403 FORBIDDEN)');

    console.log('\n======================================================');
    console.log('✨ ALL 15 AUTOMATED BACKEND TESTS PASSED CLEANLY! ✨');
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n❌ Test failure:', err.message);
    if (err.stack) console.error(err.stack);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
  }
}

runTests();
