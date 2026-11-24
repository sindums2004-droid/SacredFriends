import crypto from 'node:crypto';

const YOUPI_PAYMENT_API_URL = (process.env.YOUPI_PAYMENT_API_URL || 'http://localhost:6100').replace(/\/+$/, '');
const YOUPI_CHECKOUT_URL = (process.env.YOUPI_CHECKOUT_URL || 'http://localhost:7000').replace(/\/+$/, '');
const YOUPI_MERCHANT_ID = process.env.YOUPI_MERCHANT_ID || '00000000-0000-0000-0000-000000000001';
const YOUPI_MERCHANT_KEY = process.env.YOUPI_MERCHANT_KEY || 'mk_live_c12afcf0460bc5593179e0b9c25d871d1a6d00afe0494f66';
const YOUPI_WEBHOOK_SECRET = process.env.YOUPI_WEBHOOK_SECRET || 'd86590211edbe497f040a7b0f4e639527151a414a7fd7f8754bdd4d845ca1d1a';

/**
 * Service to communicate securely with the official YouPI-PG Payment Gateway API
 */
export const youpiClient = {
  getMerchantId() {
    return YOUPI_MERCHANT_ID;
  },

  getCheckoutBaseUrl() {
    return YOUPI_CHECKOUT_URL;
  },

  getApiBaseUrl() {
    return YOUPI_PAYMENT_API_URL;
  },

  /**
   * Create an authoritative payment session in YouPI-PG
   * @param {Object} params
   * @param {string} params.orderId - Unique order ID
   * @param {number} params.amount - Amount in Rupees (e.g. 499)
   * @param {string} params.currency - Currency (default 'INR')
   * @param {string} params.customerName - Customer name
   * @param {string} params.customerEmail - Customer email
   * @param {string} [params.returnUrl] - URL to redirect customer upon payment
   * @param {string} [params.description] - Product description
   */
  async createPaymentSession({
    orderId,
    amount,
    currency = 'INR',
    customerName,
    customerEmail,
    returnUrl,
    description = 'Sacred Friends V2 – Premium Personal License'
  }) {
    const formattedAmount = Number(amount).toFixed(2);
    const idempotencyKey = `idem_${orderId}`;

    const payload = {
      orderId,
      amount: formattedAmount,
      currency,
      method: 'MANUAL_UPI',
      description,
      customer: {
        name: customerName,
        email: customerEmail
      },
      returnUrl: returnUrl || `http://localhost:5000/api/payment/return?orderId=${encodeURIComponent(orderId)}`
    };

    const res = await fetch(`${YOUPI_PAYMENT_API_URL}/api/v1/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Merchant-Id': YOUPI_MERCHANT_ID,
        'X-Merchant-Key': YOUPI_MERCHANT_KEY,
        'Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = data.error || data.message || `YouPI-PG error HTTP ${res.status}`;
      const err = new Error(errorMsg);
      err.code = data.code || 'YOUPI_ERROR';
      err.status = res.status;
      throw err;
    }

    return {
      paymentId: data.paymentId,
      orderId: data.orderId,
      amount: data.amount,
      amountPaise: data.amountPaise,
      currency: data.currency,
      status: data.status,
      checkoutUrl: data.checkoutUrl || `${YOUPI_CHECKOUT_URL}/checkout/${data.paymentId}`
    };
  },

  /**
   * Retrieve current payment lifecycle status and outcome from YouPI-PG
   * @param {string} paymentId
   */
  async getPaymentStatus(paymentId) {
    const res = await fetch(`${YOUPI_PAYMENT_API_URL}/api/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: {
        'X-Merchant-Id': YOUPI_MERCHANT_ID,
        'X-Merchant-Key': YOUPI_MERCHANT_KEY
      }
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch payment status: HTTP ${res.status}`);
    }

    return await res.json();
  },

  /**
   * Cancel an in-flight payment session in YouPI-PG
   * @param {string} paymentId
   */
  async cancelPaymentSession(paymentId) {
    try {
      const res = await fetch(`${YOUPI_PAYMENT_API_URL}/api/v1/checkout/${encodeURIComponent(paymentId)}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Merchant-Id': YOUPI_MERCHANT_ID
        }
      });
      return await res.json().catch(() => ({ success: false }));
    } catch (err) {
      console.warn('[YouPI] Cancel session error:', err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Verify YouPI-PG HMAC-SHA256 signature for incoming webhooks
   * @param {string|Buffer} rawBody - Exact raw byte string received
   * @param {string} signatureHeader - Value of X-Gateway-Signature header (e.g. 'sha256=<hex>')
   * @param {string} [timestampHeader] - Value of X-Gateway-Timestamp header
   * @param {string} [signatureV2Header] - Value of X-Gateway-Signature-V2 header
   */
  verifyWebhookSignature(rawBody, signatureHeader, timestampHeader, signatureV2Header) {
    if (!signatureHeader && !signatureV2Header) return false;

    const secret = YOUPI_WEBHOOK_SECRET;

    // Check V2 timestamp-bound signature if present
    if (signatureV2Header && timestampHeader) {
      const expectedV2Hmac = crypto
        .createHmac('sha256', secret)
        .update(`${timestampHeader}.${rawBody}`)
        .digest('hex');
      const expectedV2 = `sha256=${expectedV2Hmac}`;

      if (crypto.timingSafeEqual(Buffer.from(signatureV2Header), Buffer.from(expectedV2))) {
        return true;
      }
    }

    // Check standard V1 signature
    if (signatureHeader) {
      const expectedHmac = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');
      const expectedSig = signatureHeader.startsWith('sha256=') ? `sha256=${expectedHmac}` : expectedHmac;

      if (signatureHeader.length === expectedSig.length &&
          crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expectedSig))) {
        return true;
      }
    }

    return false;
  }
};

