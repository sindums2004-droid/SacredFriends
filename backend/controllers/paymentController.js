import crypto from 'node:crypto';
import { repository } from '../storage/db.js';
import { youpiClient } from '../services/youpiClient.js';

function generateLicenseKey() {
  const segment = () => crypto.randomBytes(2).toString('hex').toUpperCase();
  return `SF2-${segment()}-${segment()}-${segment()}-${segment()}`;
}

// Track processed webhook delivery IDs for deduplication & replay protection
const processedDeliveries = new Set();

/**
 * Creates an authoritative payment order and session via YouPI-PG
 * POST /api/payment/create-order
 */
export async function createOrder(req, res) {
  try {
    const config = await repository.getConfig();
    if (!config.priceConfigured || config.v2Price === null) {
      return res.status(400).json({
        error: 'PRICE_NOT_CONFIGURED',
        message: 'Sacred Friends V2 Premium price is not yet available. Please check back soon.'
      });
    }

    const { customerName, customerEmail } = req.body;
    if (!customerEmail || !customerName) {
      return res.status(400).json({
        error: 'MISSING_CUSTOMER_INFO',
        message: 'Customer name and valid email are required to generate your personal license.'
      });
    }

    const amount = Number(config.v2Price);
    const amountInPaise = Math.round(amount * 100);
    const currency = config.currency || 'INR';
    const orderId = `SF-ORD-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    // 1. Record pending order in local database
    await repository.createOrder({
      orderId,
      amount,
      currency,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      gateway: 'YouPI-PG',
      status: 'CREATED'
    });

    // 2. Create authoritative session in YouPI-PG Gateway
    let youpiSession;
    try {
      youpiSession = await youpiClient.createPaymentSession({
        orderId,
        amount,
        currency,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        description: 'Sacred Friends V2 – Premium Personal License'
      });
    } catch (youpiErr) {
      console.error('[YouPI-PG] Session creation failed:', youpiErr.message);

      // Graceful fallback for local development if YouPI services are unreachable
      if (process.env.NODE_ENV !== 'production') {
        const fallbackPaymentId = 'pay_sim_' + crypto.randomBytes(8).toString('hex');
        const fallbackCheckoutUrl = `${youpiClient.getCheckoutBaseUrl()}/checkout/${fallbackPaymentId}`;
        await repository.updateOrder(orderId, {
          paymentId: fallbackPaymentId,
          checkoutUrl: fallbackCheckoutUrl,
          status: 'PAYMENT_PENDING'
        });

        return res.status(200).json({
          success: true,
          orderId,
          paymentId: fallbackPaymentId,
          amount: amountInPaise,
          displayAmount: amount,
          currency,
          checkoutUrl: fallbackCheckoutUrl,
          isSimulation: true
        });
      }

      return res.status(502).json({
        error: 'PAYMENT_GATEWAY_UNAVAILABLE',
        message: 'The YouPI-PG payment gateway is temporarily unreachable. Please try again shortly.'
      });
    }

    // 3. Update order with YouPI-PG session details
    await repository.updateOrder(orderId, {
      paymentId: youpiSession.paymentId,
      checkoutUrl: youpiSession.checkoutUrl,
      status: 'PAYMENT_PENDING'
    });

    return res.status(200).json({
      success: true,
      orderId,
      paymentId: youpiSession.paymentId,
      amount: amountInPaise,
      displayAmount: amount,
      currency,
      checkoutUrl: youpiSession.checkoutUrl
    });
  } catch (error) {
    console.error('[Payment] Create order exception:', error);
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'An unexpected server error occurred while creating your order.'
    });
  }
}

/**
 * Handle authoritative HMAC-SHA256 signed webhooks from YouPI-PG
 * POST /api/payment/youpi-webhook
 */
export async function handleYoupiWebhook(req, res) {
  try {
    const rawBody = req.rawBody || JSON.stringify(req.body);
    const signature = req.headers['x-gateway-signature'];
    const signatureV2 = req.headers['x-gateway-signature-v2'];
    const timestamp = req.headers['x-gateway-timestamp'];
    const deliveryId = req.headers['x-gateway-delivery-id'] || req.body?.deliveryId;

    // 1. Signature Verification
    const isSignatureValid = youpiClient.verifyWebhookSignature(rawBody, signature, timestamp, signatureV2);

    if (!isSignatureValid && process.env.NODE_ENV !== 'test') {
      console.warn('[Webhook] Invalid signature from:', req.ip, { signature, signatureV2 });
      return res.status(401).json({
        error: 'INVALID_SIGNATURE',
        message: 'Webhook signature verification failed.'
      });
    }

    // 2. Replay & Duplicate Delivery Protection
    if (deliveryId) {
      if (processedDeliveries.has(deliveryId)) {
        console.log(`[Webhook] Duplicate delivery ${deliveryId} ignored safely.`);
        return res.status(200).json({ success: true, message: 'Already processed.' });
      }
      processedDeliveries.add(deliveryId);
    }

    const { event, orderId, paymentId, amount, amountPaise, currency, utr } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'MISSING_ORDER_ID' });
    }

    // 3. Verify Order Existence
    const order = await repository.findOrderById(orderId);
    if (!order) {
      console.warn(`[Webhook] Unknown order received: ${orderId}`);
      return res.status(404).json({ error: 'ORDER_NOT_FOUND' });
    }

    // 4. Verify Financial Amount & Detect Underpayment Fraud
    const expectedPaise = Math.round(Number(order.amount) * 100);
    const receivedPaise = amountPaise !== undefined ? Number(amountPaise) : Math.round(Number(amount) * 100);

    if (receivedPaise < expectedPaise) {
      console.error(`[FRAUD ALERT] Underpayment detected for order ${orderId}: expected ${expectedPaise} paise (₹${order.amount}), received ${receivedPaise} paise (₹${receivedPaise / 100})`);
      await repository.updateOrder(orderId, {
        status: 'UNDERPAYMENT_DETECTED',
        receivedAmount: receivedPaise / 100,
        utr: utr || null,
        fraudNote: `Customer transferred ₹${receivedPaise / 100} instead of required ₹${order.amount}`
      });
      return res.status(400).json({
        error: 'UNDERPAYMENT_DETECTED',
        message: `Underpayment detected. Required ₹${order.amount}, received ₹${receivedPaise / 100}. License blocked.`
      });
    }

    if (receivedPaise !== expectedPaise) {
      console.warn(`[Webhook] Overpayment notice for order ${orderId}: expected ${expectedPaise}, got ${receivedPaise}`);
    }

    // 5. Handle Gateway Events
    const isPaymentConfirmed = ['SUCCESS', 'OBSERVED_SUCCESS', 'RECONCILED', 'PAYMENT_CONFIRMED'].includes(event);

    if (isPaymentConfirmed) {
      // Idempotency: prevent duplicate licenses for already confirmed order
      if (order.status === 'PAYMENT_CONFIRMED' || order.status === 'LICENSE_GENERATED') {
        return res.status(200).json({ success: true, message: 'Already fulfilled.' });
      }

      const licenseKey = generateLicenseKey();

      // Create license
      const license = await repository.createLicense({
        licenseKey,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        paymentId: paymentId || order.paymentId,
        orderId: order.orderId,
        amount: order.amount,
        currency: currency || order.currency
      });

      // Record verified payment
      await repository.recordPayment({
        orderId: order.orderId,
        paymentId: paymentId || order.paymentId,
        signature: signature || signatureV2 || 'verified_youpi_webhook',
        amount: order.amount,
        currency: currency || order.currency,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        gateway: 'YouPI-PG',
        utr: utr || null,
        deliveryId: deliveryId || null,
        licenseKey: license.licenseKey,
        status: 'verified'
      });

      // Update order status
      await repository.updateOrder(orderId, {
        status: 'LICENSE_GENERATED',
        licenseKey: license.licenseKey,
        utr: utr || null
      });

      console.log(`[YouPI-PG Webhook] Payment confirmed for ${orderId}. License issued: ${license.licenseKey}`);
      return res.status(200).json({ success: true, licenseIssued: true, licenseKey: license.licenseKey });
    }

    if (event === 'MANUAL_REVIEW') {
      await repository.updateOrder(orderId, {
        status: 'PAYMENT_VERIFICATION_PENDING',
        utr: utr || null
      });
      return res.status(200).json({ success: true, status: 'MANUAL_REVIEW' });
    }

    if (event === 'FAILED') {
      await repository.updateOrder(orderId, { status: 'PAYMENT_FAILED' });
      return res.status(200).json({ success: true, status: 'FAILED' });
    }

    if (event === 'CANCELLED') {
      await repository.updateOrder(orderId, { status: 'PAYMENT_CANCELLED' });
      return res.status(200).json({ success: true, status: 'CANCELLED' });
    }

    return res.status(200).json({ success: true, status: 'ACKNOWLEDGED' });
  } catch (error) {
    console.error('[Webhook] Exception processing YouPI webhook:', error);
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
}

/**
 * Frontend polling endpoint to verify payment lifecycle status
 * GET /api/payment/status/:orderId
 */
export async function checkOrderStatus(req, res) {
  try {
    const { orderId } = req.params;
    const order = await repository.findOrderById(orderId);

    if (!order) {
      return res.status(404).json({
        error: 'ORDER_NOT_FOUND',
        message: 'Order reference not found.'
      });
    }

    // 1. If already fulfilled with license
    if (order.licenseKey) {
      const tokenRecord = await repository.createDownloadToken(order.licenseKey);
      return res.status(200).json({
        success: true,
        status: 'SUCCESS',
        message: 'Payment confirmed! Your Sacred Friends Premium license is ready.',
        licenseKey: order.licenseKey,
        downloadUrl: `/api/download/v2/authorized?token=${tokenRecord.token}`,
        installerName: 'SacredFriends-V2-Paid-Setup.exe'
      });
    }

    // 1b. Check for underpayment fraud detection
    if (order.status === 'UNDERPAYMENT_DETECTED' || order.status === 'UNDERPAYMENT_FRAUD') {
      return res.status(200).json({
        success: false,
        status: 'UNDERPAYMENT_DETECTED',
        message: `Underpayment detected! You transferred ₹${order.receivedAmount || 1}.00 instead of required ₹${order.amount}.00. A lifetime license cannot be issued for underpaid amounts.`,
        receivedAmount: order.receivedAmount || 1,
        requiredAmount: order.amount
      });
    }

    // 1c. Check for awaiting bank reconciliation (Strict Security: Never give access until genuine bank credit is confirmed)
    if (order.status === 'AWAITING_BANK_RECONCILIATION' || order.status === 'PAYMENT_VERIFICATION_PENDING') {
      return res.status(200).json({
        success: true,
        status: 'AWAITING_BANK_RECONCILIATION',
        message: `Awaiting verified bank settlement confirmation for ₹${order.amount}.00 (UTR: ${order.utr || 'Pending'}). A license is only granted once actual bank credit is verified.`,
        utr: order.utr
      });
    }

    // 2. Query YouPI-PG Gateway for real-time status if paymentId exists
    if (order.paymentId && !order.paymentId.startsWith('pay_sim_')) {
      try {
        const youpiStatus = await youpiClient.getPaymentStatus(order.paymentId);

        if (['SUCCESS', 'OBSERVED_SUCCESS', 'RECONCILED'].includes(youpiStatus.status)) {
          // Authoritative confirmation from YouPI-PG - verify exact financial amount
          const expectedPaise = Math.round(Number(order.amount) * 100);
          const receivedPaise = youpiStatus.amountPaise !== undefined ? Number(youpiStatus.amountPaise) : Math.round(Number(youpiStatus.amount) * 100);

          if (receivedPaise < expectedPaise) {
            await repository.updateOrder(orderId, {
              status: 'UNDERPAYMENT_DETECTED',
              receivedAmount: receivedPaise / 100,
              utr: youpiStatus.utr || null
            });
            return res.status(200).json({
              success: false,
              status: 'UNDERPAYMENT_DETECTED',
              message: `Underpayment detected: Received ₹${receivedPaise / 100}.00 instead of required ₹${order.amount}.00.`,
              receivedAmount: receivedPaise / 100,
              requiredAmount: order.amount
            });
          }

          const licenseKey = generateLicenseKey();
          const license = await repository.createLicense({
            licenseKey,
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            paymentId: order.paymentId,
            orderId: order.orderId,
            amount: order.amount,
            currency: order.currency
          });

          await repository.recordPayment({
            orderId: order.orderId,
            paymentId: order.paymentId,
            signature: 'authoritative_poll_verified',
            amount: order.amount,
            currency: order.currency,
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            gateway: 'YouPI-PG',
            utr: youpiStatus.utr || null,
            licenseKey: license.licenseKey,
            status: 'verified'
          });

          await repository.updateOrder(orderId, {
            status: 'LICENSE_GENERATED',
            licenseKey: license.licenseKey,
            utr: youpiStatus.utr || null
          });

          const tokenRecord = await repository.createDownloadToken(license.licenseKey);
          return res.status(200).json({
            success: true,
            status: 'SUCCESS',
            message: 'Payment confirmed! Your Sacred Friends Premium license is ready.',
            licenseKey: license.licenseKey,
            downloadUrl: `/api/download/v2/authorized?token=${tokenRecord.token}`,
            installerName: 'SacredFriends-V2-Paid-Setup.exe'
          });
        }

        if (youpiStatus.status === 'MANUAL_REVIEW') {
          return res.status(200).json({
            success: true,
            status: 'AWAITING_BANK_RECONCILIATION',
            message: 'Your payment is awaiting confirmation. Your license will be activated after bank verification.'
          });
        }

        if (youpiStatus.status === 'FAILED') {
          return res.status(200).json({
            success: false,
            status: 'PAYMENT_FAILED',
            message: 'Payment could not be completed. Please try again.'
          });
        }

        if (youpiStatus.status === 'CANCELLED') {
          return res.status(200).json({
            success: false,
            status: 'PAYMENT_CANCELLED',
            message: 'Payment was cancelled. You can try again.'
          });
        }
      } catch (err) {
        console.warn('[YouPI-PG] Poll query error:', err.message);
      }
    }

    // Default pending state
    return res.status(200).json({
      success: true,
      status: 'PAYMENT_PENDING',
      message: 'Your payment is being verified. Please wait.'
    });
  } catch (error) {
    console.error('[Payment] Check order status error:', error);
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
}

/**
 * Manual UPI UTR Submission & Genuine Verification
 * POST /api/payment/submit-utr
 */
export async function submitUtr(req, res) {
  try {
    const { orderId, utr } = req.body;
    if (!orderId || !utr) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_FIELDS',
        message: 'Order ID and 12-digit UPI Reference / UTR Number are required.'
      });
    }

    const cleanUtr = String(utr).trim().replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (cleanUtr.length !== 12) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_UTR_LENGTH',
        message: 'Please enter a valid 12-digit UPI Reference / UTR number from your payment app receipt.'
      });
    }

    // Anti-Fraud: Reject dummy repeated patterns (e.g. 000000000000, 111111111111)
    if (/^(.)\1{11}$/.test(cleanUtr)) {
      return res.status(400).json({
        success: false,
        error: 'BOGUS_UTR_REJECTED',
        message: 'Invalid UTR reference: Repeated character pattern detected. Please enter your genuine bank transaction UTR.'
      });
    }

    // Anti-Fraud: Reject sequential or common fake test patterns
    const sequentialDummies = ['123456789012', '012345678901', '987654321098', '000012345678', '111122223333'];
    if (sequentialDummies.includes(cleanUtr)) {
      return res.status(400).json({
        success: false,
        error: 'BOGUS_UTR_REJECTED',
        message: 'Invalid UTR reference: Sequential or placeholder test pattern rejected.'
      });
    }

    const order = await repository.findOrderById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'ORDER_NOT_FOUND',
        message: 'Order reference not found. Please create a new order.'
      });
    }

    if (order.licenseKey) {
      const tokenRecord = await repository.createDownloadToken(order.licenseKey);
      return res.status(200).json({
        success: true,
        status: 'SUCCESS',
        licenseKey: order.licenseKey,
        downloadUrl: `/api/download/v2/authorized?token=${tokenRecord.token}`
      });
    }

    // Anti-Fraud: Check if UTR was already used on another order to prevent replay attacks
    const existingPayment = await repository.findPaymentByUtr(cleanUtr);
    if (existingPayment && existingPayment.orderId !== orderId) {
      return res.status(409).json({
        success: false,
        error: 'DUPLICATE_UTR_REJECTED',
        message: 'Security Alert: This UPI UTR reference number has already been claimed for another order. UTR reuse is blocked and logged.'
      });
    }

    // Cross-verify with YouPI Gateway / Banking Observer
    if (order.paymentId && !order.paymentId.startsWith('pay_sim_')) {
      try {
        const youpiStatus = await youpiClient.getPaymentStatus(order.paymentId);

        if (['SUCCESS', 'OBSERVED_SUCCESS', 'RECONCILED'].includes(youpiStatus.status)) {
          // Verify exact financial amount to detect ₹1 underpayments
          const expectedPaise = Math.round(Number(order.amount) * 100);
          const receivedPaise = youpiStatus.amountPaise !== undefined ? Number(youpiStatus.amountPaise) : Math.round(Number(youpiStatus.amount) * 100);

          if (receivedPaise < expectedPaise) {
            await repository.updateOrder(orderId, {
              status: 'UNDERPAYMENT_DETECTED',
              receivedAmount: receivedPaise / 100,
              utr: cleanUtr
            });
            return res.status(400).json({
              success: false,
              error: 'UNDERPAYMENT_DETECTED',
              message: `Underpayment detected! You transferred ₹${receivedPaise / 100}.00, but Sacred Friends Premium requires ₹${order.amount}.00. Licenses are never granted for underpaid amounts.`
            });
          }

          // Legitimate confirmed settlement
          const licenseKey = generateLicenseKey();
          const license = await repository.createLicense({
            licenseKey,
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            paymentId: order.paymentId,
            orderId: order.orderId,
            amount: order.amount,
            currency: order.currency
          });

          await repository.recordPayment({
            orderId: order.orderId,
            paymentId: order.paymentId,
            signature: 'youpi_reconciled_utr',
            amount: order.amount,
            currency: order.currency,
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            gateway: 'YouPI-PG',
            utr: cleanUtr,
            licenseKey: license.licenseKey,
            status: 'verified'
          });

          await repository.updateOrder(order.orderId, {
            status: 'LICENSE_GENERATED',
            licenseKey: license.licenseKey,
            utr: cleanUtr
          });

          const tokenRecord = await repository.createDownloadToken(license.licenseKey);
          return res.status(200).json({
            success: true,
            status: 'SUCCESS',
            message: 'Payment confirmed by bank ledger! License unlocked.',
            licenseKey: license.licenseKey,
            downloadUrl: `/api/download/v2/authorized?token=${tokenRecord.token}`,
            installerName: 'SacredFriends-V2-Paid-Setup.exe'
          });
        }
      } catch (err) {
        console.warn('[YouPI] Gateway check during submit-utr:', err.message);
      }
    }

    // If bank credit has not yet been confirmed by gateway/bank webhook:
    // Put order into awaiting reconciliation queue. DO NOT ISSUE LICENSE YET!
    await repository.updateOrder(order.orderId, {
      status: 'AWAITING_BANK_RECONCILIATION',
      utr: cleanUtr,
      utrSubmittedAt: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      status: 'AWAITING_BANK_RECONCILIATION',
      message: `UPI Reference ${cleanUtr} recorded. Bank settlement verification in progress for ₹${order.amount}.00. A lifetime license will be issued once the banking network confirms credit.`,
      orderId: order.orderId,
      utr: cleanUtr
    });
  } catch (error) {
    console.error('[Payment] Submit UTR error:', error);
    return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
}

/**
 * Local simulation endpoint strictly reserved for automated testing
 * POST /api/payment/dev-simulate
 */
export async function simulatePaymentSuccess(req, res) {
  try {
    // Block simulation in all non-test environments
    if (process.env.NODE_ENV !== 'test') {
      return res.status(403).json({
        error: 'SIMULATION_FORBIDDEN',
        message: 'Security Notice: Payment simulation is disabled. Real payment verification with YouPI-PG Gateway is enforced.'
      });
    }

    const { orderId } = req.body;
    let order = await repository.findOrderById(orderId);

    if (!order) {
      const config = await repository.getConfig();
      order = await repository.createOrder({
        orderId: orderId || `SF-ORD-TEST-${Date.now()}`,
        amount: config.v2Price || 499,
        currency: 'INR',
        customerName: 'Test Devotee',
        customerEmail: 'test@example.com',
        gateway: 'YouPI-PG',
        status: 'CREATED'
      });
    }

    if (order.licenseKey) {
      const tokenRecord = await repository.createDownloadToken(order.licenseKey);
      return res.status(200).json({
        success: true,
        licenseKey: order.licenseKey,
        downloadUrl: `/api/download/v2/authorized?token=${tokenRecord.token}`
      });
    }

    const licenseKey = generateLicenseKey();
    const license = await repository.createLicense({
      licenseKey,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      paymentId: order.paymentId || `pay_sim_${Date.now()}`,
      orderId: order.orderId,
      amount: order.amount,
      currency: order.currency
    });

    await repository.recordPayment({
      orderId: order.orderId,
      paymentId: order.paymentId || `pay_sim_${Date.now()}`,
      signature: 'test_simulation_signature',
      amount: order.amount,
      currency: order.currency,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      gateway: 'YouPI-PG',
      licenseKey: license.licenseKey,
      status: 'verified'
    });

    await repository.updateOrder(order.orderId, {
      status: 'LICENSE_GENERATED',
      licenseKey: license.licenseKey
    });

    const tokenRecord = await repository.createDownloadToken(license.licenseKey);

    return res.status(200).json({
      success: true,
      message: 'Payment confirmed! Your Sacred Friends Premium license is ready.',
      licenseKey: license.licenseKey,
      downloadUrl: `/api/download/v2/authorized?token=${tokenRecord.token}`,
      installerName: 'SacredFriends-V2-Paid-Setup.exe'
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Administrator List All Orders (for UPI Merchant Reconciliation)
 * GET /api/admin/orders
 */
export async function adminListOrders(req, res) {
  try {
    const adminKey = req.headers['x-admin-secret'] || req.headers['x-admin-key'] || req.query.adminSecretKey || req.body?.adminSecretKey;
    const requiredSecret = process.env.ADMIN_SECRET_KEY || 'sacred-friends-super-admin-secret-2026';

    if (!adminKey || adminKey !== requiredSecret) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid administrator credentials.' });
    }

    const orders = await repository.getAllOrders();
    return res.status(200).json({ success: true, count: orders.length, orders });
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: error.message });
  }
}

/**
 * Administrator Approve Order & Reconcile UTR (Path 2: Merchant-Verified Mode)
 * POST /api/admin/approve-order
 */
export async function adminApproveOrder(req, res) {
  try {
    const adminKey = req.headers['x-admin-secret'] || req.headers['x-admin-key'] || req.body?.adminSecretKey || req.query?.adminSecretKey;
    const requiredSecret = process.env.ADMIN_SECRET_KEY || 'sacred-friends-super-admin-secret-2026';

    if (!adminKey || adminKey !== requiredSecret) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid administrator credentials.' });
    }

    const { orderId, utr } = req.body;
    if (!orderId && !utr) {
      return res.status(400).json({ error: 'ORDER_IDENTIFIER_REQUIRED', message: 'orderId or utr is required.' });
    }

    let order = null;
    if (orderId) {
      order = await repository.findOrderById(orderId);
    }
    if (!order && utr) {
      const allOrders = await repository.getAllOrders();
      order = allOrders.find((o) => o.utr === String(utr).trim()) || null;
    }

    if (!order) {
      return res.status(404).json({ error: 'ORDER_NOT_FOUND', message: 'Order not found.' });
    }

    // If order already has a license minted, return it idempotently
    if (order.licenseKey && order.status === 'LICENSE_GENERATED') {
      const tokenRecord = await repository.createDownloadToken(order.licenseKey);
      return res.status(200).json({
        success: true,
        status: 'ALREADY_APPROVED',
        message: 'Order was already verified and approved.',
        orderId: order.orderId,
        licenseKey: order.licenseKey,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        downloadUrl: `/api/download/v2/authorized?token=${tokenRecord.token}`
      });
    }

    // Mint new genuine cryptographic license key
    const licenseKey = generateLicenseKey();
    const license = await repository.createLicense({
      licenseKey,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      paymentId: order.paymentId || `pay_merch_${Date.now()}`,
      orderId: order.orderId,
      amount: order.amount,
      currency: order.currency || 'INR'
    });

    // Record verified payment
    await repository.recordPayment({
      orderId: order.orderId,
      paymentId: order.paymentId || `pay_merch_${Date.now()}`,
      signature: 'admin_merchant_reconciliation_verified',
      amount: order.amount,
      currency: order.currency || 'INR',
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      gateway: 'YouPI-PG (Merchant Reconciliation)',
      utr: order.utr || utr || 'MERCHANT_VERIFIED',
      licenseKey: license.licenseKey,
      status: 'verified'
    });

    // Update order status so polling frontend immediately unlocks
    await repository.updateOrder(order.orderId, {
      status: 'LICENSE_GENERATED',
      licenseKey: license.licenseKey,
      verifiedBy: 'MERCHANT_ADMIN',
      verifiedAt: new Date().toISOString()
    });

    const tokenRecord = await repository.createDownloadToken(license.licenseKey);

    console.log(`[Admin] ✓ Order ${order.orderId} verified by Merchant. License ${license.licenseKey} issued to ${order.customerEmail}`);

    return res.status(200).json({
      success: true,
      status: 'APPROVED',
      message: `Order approved! License ${license.licenseKey} generated and customer unlocked.`,
      orderId: order.orderId,
      licenseKey: license.licenseKey,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      downloadUrl: `/api/download/v2/authorized?token=${tokenRecord.token}`,
      installerName: 'SacredFriends-V2-Paid-Setup.exe'
    });
  } catch (error) {
    console.error('[Admin] Approve order error:', error);
    return res.status(500).json({ error: 'SERVER_ERROR', message: error.message });
  }
}



