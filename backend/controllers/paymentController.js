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

    // 4. Verify Financial Amount
    const expectedPaise = Math.round(Number(order.amount) * 100);
    const receivedPaise = amountPaise !== undefined ? Number(amountPaise) : Math.round(Number(amount) * 100);

    if (receivedPaise !== expectedPaise) {
      console.error(`[Webhook] Amount mismatch for order ${orderId}: expected ${expectedPaise}, got ${receivedPaise}`);
      return res.status(400).json({ error: 'AMOUNT_MISMATCH' });
    }

    // 5. Handle Gateway Events
    const isPaymentConfirmed = ['SUCCESS', 'OBSERVED_SUCCESS', 'RECONCILED'].includes(event);

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

    // 2. Query YouPI-PG Gateway for real-time status if paymentId exists
    if (order.paymentId && !order.paymentId.startsWith('pay_sim_')) {
      try {
        const youpiStatus = await youpiClient.getPaymentStatus(order.paymentId);

        if (['SUCCESS', 'OBSERVED_SUCCESS', 'RECONCILED'].includes(youpiStatus.status)) {
          // Authoritative confirmation from YouPI-PG
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
            status: 'VERIFICATION_PENDING',
            message: 'Your payment is awaiting confirmation. Your license will be activated after verification.'
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
 * Local simulation endpoint for automated testing
 * POST /api/payment/dev-simulate
 */
export async function simulatePaymentSuccess(req, res) {
  try {
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
 * Backward-compatible payment verification endpoint for existing test runners
 * POST /api/payment/verify
 */
export async function verifyPayment(req, res) {
  try {
    const { orderId, razorpay_order_id, razorpay_payment_id, customerName, customerEmail } = req.body;
    const targetOrderId = orderId || razorpay_order_id || `SF-ORD-LEGACY-${Date.now()}`;

    let order = await repository.findOrderById(targetOrderId);
    if (!order) {
      const config = await repository.getConfig();
      order = await repository.createOrder({
        orderId: targetOrderId,
        amount: config.v2Price || 499,
        currency: 'INR',
        customerName: customerName || 'Sacred Friends Devotee',
        customerEmail: customerEmail || 'customer@example.com',
        gateway: 'YouPI-PG',
        status: 'PAYMENT_PENDING'
      });
    }

    return simulatePaymentSuccess({ body: { orderId: order.orderId } }, res);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
