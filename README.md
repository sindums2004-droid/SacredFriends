# Sacred Friends — Full-Stack Production Platform
## Q-CUBIC | Ideas. People. Real Impact.
**Slogan:** Small Ideas Build Big Things.

Sacred Friends is a Windows desktop companion application developed by Q-CUBIC that allows users to download and use divine characters as companions on their desktop.

This repository contains the complete, single-page, cinematic full-stack website, Express.js backend, MongoDB database layer, Razorpay payment gateway integration, and the strict 1-User 1-Device Windows licensing system.

---

## 1. Project Identity & Architecture

- **Product:** Sacred Friends
- **Company:** Q-CUBIC
- **Tagline:** Ideas. People. Real Impact.
- **Slogan:** Small Ideas Build Big Things.
- **Format:** Single-page cinematic journey
- **Frontend:** Vite, HTML5, CSS3 Divine Heritage Design System, Vanilla ES Modules
- **Backend:** Node.js, Express.js, CORS, Helmet
- **Database:** MongoDB (via Mongoose with resilient local fallback engine)
- **Payment Gateway:** Razorpay SDK & Cryptographic HMAC SHA256 Signature Verification
- **Licensing Policy:** **ONE PAYMENT = ONE PURCHASER = ONE USER = ONE WINDOWS DEVICE.**

---

## 2. Quick Start Guide

### Prerequisites
- Node.js v18+ (tested on Node.js v24.22.1)
- npm v9+

### Installation
```bash
# In the workspace directory
npm install
```

### Running the Backend & Frontend Concurrently
```bash
npm run dev
```
- **Backend Server:** `http://localhost:5000`
- **Frontend Dev Client:** `http://localhost:5173` (proxies `/api` to port 5000)

Alternatively, run each service independently:
```bash
# Terminal 1 — Backend:
npm run dev:backend

# Terminal 2 — Frontend:
npm run dev:frontend
```

### Production Build
```bash
npm run build
npm start
```
Express will serve the optimized production bundle from `dist/` on `http://localhost:5000`.

---

## 3. Connecting MongoDB

The backend connects to MongoDB via Mongoose in `backend/storage/db.js`.

### Local MongoDB
Ensure MongoDB daemon (`mongod`) is running locally:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/sacred_friends
```

### MongoDB Atlas (Cloud)
In your `.env` file, set your Atlas connection string:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/sacred_friends?retryWrites=true&w=majority
```

> **Resilient Fallback Engine:** If MongoDB is offline or inaccessible during local development, the backend automatically transitions to an atomic local JSON engine (`backend/data/local_db_fallback.json`). The server never crashes and reports clear status logs.

---

## 4. Configuring Razorpay Payment Gateway

1. Create a Razorpay account and retrieve your API keys from the [Razorpay Dashboard](https://dashboard.razorpay.com/app/keys).
2. Set your keys in `.env`:
   ```env
   RAZORPAY_KEY_ID=rzp_test_YourKeyIdHere
   RAZORPAY_KEY_SECRET=YourSecretKeyHere
   ```
3. In test mode, transactions will use Razorpay test card credentials (or the verified test flow when placeholder keys are present).
4. The backend verifies incoming payment signatures using cryptographic HMAC SHA256 (`backend/controllers/paymentController.js`):
   $$\text{HMAC-SHA256}(\text{order\_id} + "|" + \text{payment\_id}, \text{secret})$$
5. Frontend payment success messages are **never trusted blindly**; only backend signature verification triggers personal license generation.

---

## 5. The 15 Original Sacred Friends Characters

All 15 verified characters are included individually with original artwork, proportions, titles, categories, and behaviors:

| # | Character | Category | Title | Default Portrait |
|---|---|---|---|---|
| 1 | **Krishna** | Little Companions | The Playful Lord & Flute Charmer | `/assets/characters/portraits/krishna.png` |
| 2 | **Ganesha** | Little Companions | The Remover of Obstacles & Muse of Learning | `/assets/characters/portraits/ganesha.png` |
| 3 | **Hanuman** | Little Companions | The Devoted Friend & Valiant Helper | `/assets/characters/portraits/hanuman.png` |
| 4 | **Shiva** | Deities & Avatars | The Serene Ascetic & Cosmos Weaver | `/assets/characters/portraits/shiva.png` |
| 5 | **Saraswati** | Goddesses | Goddess of Knowledge, Music & Wisdom | `/assets/characters/portraits/saraswati.png` |
| 6 | **Lakshmi** | Goddesses | Goddess of Abundance, Grace & Fortune | `/assets/characters/portraits/lakshmi.png` |
| 7 | **Durga Maa** | Cosmic Guardians | The Fearless Mother & Guardian of Dharma | `/assets/characters/portraits/durga.png` |
| 8 | **Parvati** | Goddesses | The Nurturing Mother & Mountain Maiden | `/assets/characters/portraits/parvati.png` |
| 9 | **Radha** | Little Companions | The Joyful Maiden of Vrindavan | `/assets/characters/portraits/radha.png` |
| 10 | **Rama** | Deities & Avatars | The Steadfast Prince of Dharma | `/assets/characters/portraits/rama.png` |
| 11 | **Sita** | Goddesses | The Earthborn Queen of Grace & Fortitude | `/assets/characters/portraits/sita.png` |
| 12 | **Kartikeya** | Little Companions | The Valiant Commander & Peacock Rider | `/assets/characters/portraits/kartikeya.png` |
| 13 | **Ayyappa** | Cosmic Guardians | The Resolute Master of Sabari Hills | `/assets/characters/portraits/ayyappa.png` |
| 14 | **Venkateswara** | Deities & Avatars | The Supreme Bestower of Tirumala Hills | `/assets/characters/portraits/venkateswara.png` |
| 15 | **Narasimha** | Cosmic Guardians | The Loving Defender of the Faithful | `/assets/characters/portraits/narasimha.png` |

---

## 6. Configuring the V1 Free Installer

- **Public Filename:** `SacredFriends-V1-Free-Setup.exe`
- **Location:** `public/downloads/SacredFriends-V1-Free-Setup.exe` (and `dist/downloads/`)
- **API Endpoint:** `GET /api/download/v1`
- **Status Check:** `GET /api/download/v1/status`
- The website displays real state transitions:
  - Default: *"Download V1 – Free"*
  - Preparing: *"Preparing your Sacred Friends V1 download..."* (spinner)
  - Started: *"Your Sacred Friends V1 download has started."* (filename shown)
  - Unavailable: *"The V1 installer is temporarily unavailable. Please try again later."*

---

## 7. Protecting the V2 Premium Installer

- **Private Filename:** `SacredFriends-V2-Paid-Setup.exe`
- **Storage:** `backend/private_downloads/SacredFriends-V2-Paid-Setup.exe`
- **Protection Rules:**
  - **Never** placed in public or static web root.
  - Requires verified payment and personal license.
  - Downloads are authorized solely through short-lived cryptographic tokens (30 minutes expiry).
  - Stream endpoint: `GET /api/download/v2/authorized?token=<secure_token>`
  - Expired, tampered, or missing tokens return HTTP 401 / 403 / 410.

---

## 8. Strict 1-User 1-Device Windows Licensing Policy

**Policy:** ONE PAYMENT = ONE PURCHASER = ONE USER = ONE WINDOWS DEVICE.

### Desktop App & API Integration
1. **Activation:**
   - Endpoint: `POST /api/license/activate`
   - Body: `{ "licenseKey": "SF2-XXXX-XXXX-XXXX-XXXX", "deviceFingerprint": "<hardware_guid>", "deviceName": "<pc_name>" }`
   - On first activation, the license is bound to `deviceFingerprint`.
2. **Reinstallation:**
   - If the same registered device reactivates (e.g. after Windows reformat), the backend returns `REINSTALLED_OK` without requiring another purchase.
3. **Unauthorized Device Rejection:**
   - If an unauthorized second device attempts activation, the backend returns HTTP 403:
     > *"This Sacred Friends Premium license is already registered to another device. Only the original purchaser can use this license on their registered device. Please contact support if you need assistance."*
4. **Admin Device Reset:**
   - When a purchaser migrates to a new PC, an authorized administrator can reset the binding:
     - Endpoint: `POST /api/admin/reset-device`
     - Body: `{ "licenseKey": "...", "adminSecretKey": "...", "reason": "Hardware replacement" }`

### Testing the Licensing Policy
Run the automated test suite in terminal:
```bash
npm test
# or
node backend/test_runner.js
```
Or interact directly with the **Licensing Platform Diagnostic Widget** embedded on the website beneath the Editions section.

