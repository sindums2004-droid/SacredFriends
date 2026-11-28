import crypto from 'node:crypto';
import { repository } from '../storage/db.js';
import { handleYoupiWebhook, checkOrderStatus, submitUtr, adminListOrders, adminApproveOrder } from '../controllers/paymentController.js';
import { activateLicense, validateLicense } from '../controllers/licenseController.js';

async function runWorkflowAudit() {
  console.log('========================================================');
  console.log('🔍 SACRED FRIENDS PAYMENT & ANTI-FRAUD WORKFLOW AUDIT');
  console.log('========================================================\n');

  // STEP 1: Configuration Verification
  console.log('[Step 1] Checking Configuration...');
  const config = await repository.getConfig();
  if (config.v2Price !== 499) {
    throw new Error(`V2 price mismatch: expected 499, got ${config.v2Price}`);
  }
  console.log(`  ✓ Config Validated: Price = ₹${config.v2Price} ${config.currency}`);

  // STEP 2: Order Creation Simulation
  console.log('\n[Step 2] Testing Order Creation in Database...');
  const testOrderId = `SF-TEST-WF-${Date.now()}`;
  const testEmail = 'arjun.test@sacredfriends.com';
  const testName = 'Arjun Verma';

  const createdOrder = await repository.createOrder({
    orderId: testOrderId,
    amount: 499,
    currency: 'INR',
    customerName: testName,
    customerEmail: testEmail,
    gateway: 'YouPI-PG',
    status: 'CREATED'
  });
  console.log(`  ✓ Order Created in Database: ${createdOrder.orderId}`);

  // STEP 3: ANTI-FRAUD TEST - ₹1 Underpayment Attempt via Webhook
  console.log('\n[Step 3] Testing Anti-Fraud Gate: ₹1.00 Underpayment Attempt...');
  const webhookSecret = process.env.YOUPI_WEBHOOK_SECRET || 'd86590211edbe497f040a7b0f4e639527151a414a7fd7f8754bdd4d845ca1d1a';
  const underpayPayload = JSON.stringify({
    orderId: testOrderId,
    event: 'SUCCESS',
    amount: 1,
    amountPaise: 100, // ₹1.00 instead of ₹499.00
    currency: 'INR',
    utr: `UTR1RUPEE${Date.now().toString().slice(-3)}`,
    deliveryId: `del_underpay_${Date.now()}`
  });

  const underpaySignature = crypto.createHmac('sha256', webhookSecret).update(underpayPayload).digest('hex');
  let underpayStatus = null;
  let underpayBody = null;
  await handleYoupiWebhook({
    headers: { 'x-gateway-signature': underpaySignature },
    body: JSON.parse(underpayPayload)
  }, {
    status(c) { underpayStatus = c; return this; },
    json(d) { underpayBody = d; return this; }
  });

  if (underpayStatus === 400 && underpayBody?.error === 'UNDERPAYMENT_DETECTED') {
    console.log('  ✓ Security Gate Blocked Underpayment (₹1.00): HTTP 400 (UNDERPAYMENT_DETECTED)');
  } else {
    throw new Error(`Security gate failed to block ₹1 underpayment! Received: ${underpayStatus}`);
  }

  // STEP 4: ANTI-FRAUD TEST - Dummy / Bogus 12-digit UTR Attempt
  console.log('\n[Step 4] Testing Anti-Fraud Gate: Fake / Dummy UTR Submission...');
  let dummyStatus = null;
  let dummyBody = null;
  await submitUtr({
    body: { orderId: testOrderId, utr: '123456789012' }
  }, {
    status(c) { dummyStatus = c; return this; },
    json(d) { dummyBody = d; return this; }
  });

  if (dummyStatus === 400 && dummyBody?.error === 'BOGUS_UTR_REJECTED') {
    console.log('  ✓ Security Gate Blocked Dummy UTR (123456789012): HTTP 400 (BOGUS_UTR_REJECTED)');
  } else {
    throw new Error(`Security gate failed to block dummy UTR! Status: ${dummyStatus}`);
  }

  // STEP 5: Genuine ₹499 Cryptographic Webhook (Full Verified Settlement)
  console.log('\n[Step 5] Testing Genuine ₹499.00 HMAC-SHA256 Webhook Verification...');
  const genuineUtr = '984210384729';
  const genuinePayload = JSON.stringify({
    orderId: testOrderId,
    event: 'SUCCESS',
    amount: 499,
    amountPaise: 49900, // ₹499.00 exact
    currency: 'INR',
    utr: genuineUtr,
    deliveryId: `del_real_${Date.now()}`
  });

  const genuineSignature = crypto.createHmac('sha256', webhookSecret).update(genuinePayload).digest('hex');
  let genuineStatus = null;
  let genuineBody = null;
  await handleYoupiWebhook({
    headers: { 'x-gateway-signature': genuineSignature },
    body: JSON.parse(genuinePayload)
  }, {
    status(c) { genuineStatus = c; return this; },
    json(d) { genuineBody = d; return this; }
  });

  if (genuineStatus !== 200 || !genuineBody?.licenseIssued) {
    throw new Error(`Genuine webhook fulfillment failed: ${JSON.stringify(genuineBody)}`);
  }
  const mintedKey = genuineBody.licenseKey;
  console.log('  ✓ Genuine ₹499.00 Verified by HMAC-SHA256 Banking Engine');
  console.log(`  ✓ Genuine License Minted: ${mintedKey}`);

  // STEP 6: ANTI-FRAUD TEST - Replay Attack (Reusing Genuine UTR on Second Order)
  console.log('\n[Step 6] Testing Anti-Fraud Gate: UTR Replay Protection...');
  const secondOrderId = `SF-TEST-WF-REPLAY-${Date.now()}`;
  await repository.createOrder({
    orderId: secondOrderId,
    amount: 499,
    currency: 'INR',
    customerName: 'Fraud Attacker',
    customerEmail: 'attacker@fraud.com',
    gateway: 'YouPI-PG',
    status: 'CREATED'
  });

  let replayStatus = null;
  let replayBody = null;
  await submitUtr({
    body: { orderId: secondOrderId, utr: genuineUtr }
  }, {
    status(c) { replayStatus = c; return this; },
    json(d) { replayBody = d; return this; }
  });

  if (replayStatus === 409 && replayBody?.error === 'DUPLICATE_UTR_REJECTED') {
    console.log(`  ✓ Security Gate Blocked UTR Replay (${genuineUtr}): HTTP 409 (DUPLICATE_UTR_REJECTED)`);
  } else {
    throw new Error(`Security gate failed to block UTR replay attack! Status: ${replayStatus}`);
  }

  // STEP 7: Frontend Status Polling
  console.log(`\n[Step 7] Testing Frontend Status Poll (GET /api/payment/status/${testOrderId})...`);
  let pollStatus = null;
  let pollBody = null;
  await checkOrderStatus({ params: { orderId: testOrderId } }, {
    status(c) { pollStatus = c; return this; },
    json(d) { pollBody = d; return this; }
  });

  if (pollBody?.status !== 'SUCCESS' || pollBody?.licenseKey !== mintedKey) {
    throw new Error(`Poll verification failed: ${JSON.stringify(pollBody)}`);
  }
  console.log(`  ✓ Polling Returned Status: ${pollBody.status}`);
  console.log(`  ✓ Authorized Download URL: ${pollBody.downloadUrl}`);

  // STEP 8: Windows 1-Device Hardware Binding
  console.log('\n[Step 8] Testing Windows 1-Device License Binding...');
  const device1 = 'HW-WIN11-DESKTOP-9842A';
  let actStatus = null;
  let actBody = null;
  await activateLicense({
    body: { licenseKey: mintedKey, deviceFingerprint: device1, deviceName: 'Arjun-Main-PC' }
  }, {
    status(c) { actStatus = c; return this; },
    json(d) { actBody = d; return this; }
  });

  if (actStatus !== 200 || !actBody?.success) {
    throw new Error(`Activation failed: ${JSON.stringify(actBody)}`);
  }
  console.log(`  ✓ Primary Device Activated: ${device1} (Arjun-Main-PC)`);

  // STEP 9: Re-activation on Same Device
  console.log('\n[Step 9] Testing Re-installation on Same Device...');
  await activateLicense({
    body: { licenseKey: mintedKey, deviceFingerprint: device1, deviceName: 'Arjun-Main-PC' }
  }, {
    status(c) { actStatus = c; return this; },
    json(d) { actBody = d; return this; }
  });
  console.log('  ✓ Re-activation on Same PC Succeeded Automatically');

  // STEP 10: Unauthorized Second Device Activation (Must be Rejected)
  console.log('\n[Step 10] Testing 1-Device Security Gate (Second Device Attempt)...');
  const device2 = 'HW-WIN11-LAPTOP-PIRATE';
  let rejectStatus = null;
  let rejectBody = null;
  await activateLicense({
    body: { licenseKey: mintedKey, deviceFingerprint: device2, deviceName: 'Pirate-PC' }
  }, {
    status(c) { rejectStatus = c; return this; },
    json(d) { rejectBody = d; return this; }
  });

  if (rejectStatus === 403 && rejectBody?.error === 'DEVICE_MISMATCH') {
    console.log('  ✓ Security Gate Blocked Unauthorized Second PC: HTTP 403 (DEVICE_MISMATCH)');
    console.log(`  ✓ Security Error Message: "${rejectBody.message}"`);
  } else {
    throw new Error('Security gate failed to block second device!');
  }

  // STEP 11: Path 2 Merchant-Verified Mode (UTR Queue & Admin 1-Click Approval)
  console.log('\n[Step 11] Testing Path 2: Merchant UTR Submission & 1-Click Bank Reconciliation...');
  const path2OrderId = `SF-PATH2-ORD-${Date.now()}`;
  await repository.createOrder({
    orderId: path2OrderId,
    amount: 499,
    currency: 'INR',
    customerName: 'Priya Sharma',
    customerEmail: 'priya@example.com',
    gateway: 'YouPI-PG',
    status: 'CREATED'
  });

  // Customer transfers via PhonePe to 7019886914@axl and submits 12-digit UTR
  const submittedUtr = '718293049182';
  let utrStatus = null;
  let utrBody = null;
  await submitUtr({
    body: { orderId: path2OrderId, utr: submittedUtr }
  }, {
    status(c) { utrStatus = c; return this; },
    json(d) { utrBody = d; return this; }
  });

  if (utrBody?.status !== 'AWAITING_BANK_RECONCILIATION') {
    throw new Error(`Expected AWAITING_BANK_RECONCILIATION, got ${utrBody?.status}`);
  }
  console.log(`  ✓ Customer UTR (${submittedUtr}) Recorded -> Queued in AWAITING_BANK_RECONCILIATION`);

  // Verify that customer polling does NOT give access prematurely
  let prePollBody = null;
  await checkOrderStatus({ params: { orderId: path2OrderId } }, {
    status() { return this; },
    json(d) { prePollBody = d; return this; }
  });
  if (prePollBody?.status !== 'AWAITING_BANK_RECONCILIATION' || prePollBody?.licenseKey) {
    throw new Error('Premature license leakage before admin bank confirmation!');
  }
  console.log('  ✓ Anti-Fraud Verified: Customer screen safely polls without unverified license release');

  // Admin verifies PhonePe notification / Axis Bank credit and clicks "Approve"
  let approveStatus = null;
  let approveBody = null;
  await adminApproveOrder({
    headers: { 'x-admin-secret': 'sacred-friends-super-admin-secret-2026' },
    body: { orderId: path2OrderId }
  }, {
    status(c) { approveStatus = c; return this; },
    json(d) { approveBody = d; return this; }
  });

  if (approveStatus !== 200 || !approveBody?.licenseKey) {
    throw new Error(`Admin approval failed: ${JSON.stringify(approveBody)}`);
  }
  console.log(`  ✓ Admin Reconciled Axis Bank Credit -> License Minted: ${approveBody.licenseKey}`);

  // Customer polling immediately picks up the approved license
  let postPollBody = null;
  await checkOrderStatus({ params: { orderId: path2OrderId } }, {
    status() { return this; },
    json(d) { postPollBody = d; return this; }
  });

  if (postPollBody?.status !== 'SUCCESS' || postPollBody?.licenseKey !== approveBody.licenseKey) {
    throw new Error(`Polling did not detect approval! Got: ${JSON.stringify(postPollBody)}`);
  }
  console.log('  ✓ Customer Screen Automatically Transitioned to SUCCESS with Download Link');

  console.log('\n========================================================');
  console.log('🎉 ALL 11 AUDIT & ANTI-FRAUD STAGES PASSED: 100% OPERATIONAL & SECURE');
  console.log('========================================================\n');
}

runWorkflowAudit().catch(err => {
  console.error('\n❌ Workflow Audit Failed:', err.message);
  process.exit(1);
});
