# Sacred Friends × YouPI-PG — Complete Integration Guide

## 1. Architecture Overview

**Sacred Friends by Q-CUBIC** is a desktop companion application for Windows offering:
- **V1 Free Edition**: Standalone free installer (`SacredFriends-V1-Free-Setup.exe`).
- **V2 Premium Edition**: ₹499 one-time payment for 1 personal license tied to 1 Windows machine.

Payment processing is fully integrated with **YouPI-PG**, a sovereign self-hosted UPI payment gateway that provides instant QR code generation, UTR confirmation, and cryptographic webhook callbacks.

```
 CUSTOMER
    |
    v
 SACRED FRIENDS WEBSITE (Frontend: Port 5000 / Vite)
    |  Clicks "Buy Premium ₹499"
    v
 SACRED FRIENDS BACKEND (`POST /api/payment/create-order`)
    |  Authoritative order created (₹499 fixed price)
    v
 YOUPI-PG PAYMENT API (Port 6100: `POST /api/v1/payments`)
    |  Generates authentic session & dynamic UPI QR
    v
 YOUPI-PG CHECKOUT PORTAL (Port 7000: `/checkout/:paymentId`)
    |  Customer pays via UPI app (PhonePe, GPay, Paytm)
    v
 YOUPI-PG WEBHOOK ENGINE (HMAC-SHA256 Signed)
    |  Sends `X-Gateway-Signature` callback
    v
 SACRED FRIENDS BACKEND (`POST /api/payment/youpi-webhook`)
    |  Validates signature -> Issues License `SF2-XXXX-XXXX-XXXX-XXXX`
    v
 PROTECTED INSTALLER DOWNLOAD & WINDOWS ACTIVATION
    |  1-Device cryptographic hardware fingerprint binding
```

---

## 2. Local Port Allocation

| Service | Port | Description |
|---|---|---|
| **Sacred Friends Web & Backend** | `5000` | Main website, public download, licensing API |
| **YouPI-PG Payment API** | `6100` | Merchant order creation & status query |
| **YouPI-PG Checkout Portal** | `7000` | Customer-facing UPI QR & payment screen |
| **YouPI-PG Control Center** | `8090` | Gateway dashboard & system metrics |
| **YouPI-PG Merchant Admin** | `6001` | Merchant management & webhook config |
| **YouPI-PG Storefront** | `5099` | Showcase store (reconfigured from 5000 to avoid conflicts) |

---

## 3. How to Start the Services Locally

### Step 1: Start YouPI-PG Gateway Supervisor
In a dedicated terminal:
```bash
cd D:\YouPI-PG
node scripts/dev.js
```
All gateway microservices will start on ports 6100, 7000, 6001, 8090, and 5099.

### Step 2: Start Sacred Friends Platform
In another terminal:
```bash
cd "D:\website pet"
npm start
```
The Sacred Friends platform will start at `http://localhost:5000`.

---

## 4. Merchant Configuration & Credentials

The configured local YouPI-PG merchant credentials:
- **Merchant ID**: `00000000-0000-0000-0000-000000000001`
- **Merchant API Key**: `mk_live_c12afcf0460bc5593179e0b9c25d871d1a6d00afe0494f66`
- **Webhook Secret**: `d86590211edbe497f040a7b0f4e639527151a414a7fd7f8754bdd4d845ca1d1a`
- **Webhook Target**: `http://localhost:5000/api/payment/youpi-webhook`

---

## 5. Security & Verification Architecture

1. **Backend Price Enforcement**:
   - The price is fixed at **₹499 (INR)** strictly on the backend.
   - Any price sent by client requests is ignored.
2. **HMAC-SHA256 Webhook Verification**:
   - Every incoming webhook from YouPI-PG is checked using `X-Gateway-Signature` / `X-Gateway-Signature-V2`.
   - Tampered or forged signatures are rejected with HTTP 401.
3. **Idempotency & Replay Protection**:
   - `Idempotency-Key` headers prevent accidental duplicate orders from double-clicks.
   - Processed `X-Gateway-Delivery-Id` IDs prevent duplicate license generation.
4. **Strict 1-Device Licensing**:
   - ONE PAYMENT = ONE PURCHASER = ONE USER = ONE WINDOWS DEVICE.
   - Reinstallation on the same registered device is permitted.
   - Second device activations are rejected with:
     > *"This Sacred Friends Premium license is already registered to another device. Only the original purchaser can use this license on their registered device. Please contact support if you need assistance."*
   - Authorized device migration requires administrator reset (`POST /api/admin/reset-device`).

---

## 6. Automated Test Suite

Run the full end-to-end integration and security test suite:
```bash
npm test
```
Verifies 16 critical test cases with 100% success rate:
- Health check & public config (₹499)
- V1 download stream
- YouPI-PG session creation
- Webhook HMAC-SHA256 verification
- Forged signature rejection
- Status polling
- Authorized download stream & tampered token rejection
- Single-device licensing enforcement, reinstallation, and admin device reset.

