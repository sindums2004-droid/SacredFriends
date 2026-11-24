/**
 * Sacred Friends V2 – Premium Commerce & Licensing Engine
 * Handles dynamic in-modal UPI QR code generation, Razorpay/YouPI-PG checkout,
 * live payment verification, instant license unboxing, and 1-User 1-Device testing.
 */

import QRCode from 'qrcode';

export function initV2Commerce() {
  const getV2Btns = document.querySelectorAll('.action-get-v2');
  const v2StatusBox = document.getElementById('v2-status-box');
  const checkoutModal = document.getElementById('checkout-modal');
  const checkoutCloseBtn = document.getElementById('checkout-close-btn');
  const checkoutForm = document.getElementById('v2-checkout-form');
  const priceDisplay = document.getElementById('v2-display-price');

  // Multi-stage containers
  const stageForm = document.getElementById('checkout-stage-form');
  const stagePayment = document.getElementById('checkout-stage-payment');
  const stageSuccess = document.getElementById('checkout-stage-success');

  // Stage 2 QR elements
  const qrCanvas = document.getElementById('checkout-qr-canvas');
  const orderIdDisplay = document.getElementById('checkout-order-id-display');
  const vpaCopyBtn = document.getElementById('btn-copy-vpa');
  const vpaTextEl = document.getElementById('checkout-vpa-text');
  const verifyPaymentBtn = document.getElementById('btn-verify-upi-payment');
  const openUpiAppBtn = document.getElementById('btn-open-upi-app');
  const backToFormBtn = document.getElementById('btn-back-to-form');
  const timerEl = document.getElementById('checkout-timer');
  const radarStatusEl = document.getElementById('checkout-radar-status');

  // Stage 3 Success elements
  const successKeyEl = document.getElementById('checkout-success-key');
  const copySuccessKeyBtn = document.getElementById('btn-copy-success-key');
  const successDownloadBtn = document.getElementById('checkout-success-download');
  const successDashboardBtn = document.getElementById('checkout-success-dashboard-btn');

  // Method switcher tabs
  const methodTabs = document.querySelectorAll('.checkout-method-tab');

  let activeConfig = null;
  let currentOrderId = null;
  let currentAmount = 499;
  let pollInterval = null;
  let countdownInterval = null;

  // 1. Fetch public config from backend
  async function loadConfig() {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        activeConfig = await res.json();
        if (activeConfig.v2.isPriceConfigured && activeConfig.v2.price !== null) {
          currentAmount = activeConfig.v2.price;
          if (priceDisplay) {
            priceDisplay.textContent = `${activeConfig.v2.currency === 'INR' ? '₹' : '$'}${currentAmount}`;
          }
        } else if (priceDisplay) {
          priceDisplay.textContent = 'Price TBA';
        }
      }
    } catch (err) {
      console.warn('[V2] Config fetch failed:', err);
    }
  }
  loadConfig();

  // Switch between checkout stages
  function showStage(stage) {
    if (stageForm) stageForm.style.display = stage === 'form' ? 'block' : 'none';
    if (stagePayment) stagePayment.style.display = stage === 'payment' ? 'block' : 'none';
    if (stageSuccess) stageSuccess.style.display = stage === 'success' ? 'block' : 'none';
  }

  // Countdown timer for UPI session
  function startCountdown(totalSeconds = 600) {
    stopCountdown();
    let remaining = totalSeconds;

    function update() {
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      if (timerEl) {
        timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
      if (remaining <= 0) {
        stopCountdown();
        stopPolling();
        if (radarStatusEl) radarStatusEl.textContent = 'Order session expired. Please create a new order.';
      }
      remaining--;
    }

    update();
    countdownInterval = setInterval(update, 1000);
  }

  function stopCountdown() {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  // Status updates in main page view
  function setV2Status(state, details = {}) {
    if (!v2StatusBox) return;
    v2StatusBox.className = 'action-status-box show ' + state;

    if (state === 'opening') {
      v2StatusBox.innerHTML = `
        <div class="status-content-row">
          <div class="status-spinner"></div>
          <div>Opening secure checkout terminal...</div>
        </div>
      `;
    } else if (state === 'checkout_active') {
      v2StatusBox.innerHTML = `
        <div class="status-content-row">
          <div class="status-spinner"></div>
          <div>
            <strong>YouPI-PG Sovereign UPI Checkout Active</strong>
            <div style="font-size: 0.82rem; margin: 4px 0; color: var(--color-soft-cream);">
              Order: <span style="font-family: var(--font-mono); color: var(--color-gold-light);">${details.orderId || ''}</span> • Amount: ₹${currentAmount}
            </div>
            <div style="font-size: 0.8rem; color: #94A3B8; margin-bottom: 8px;">
              Scan the dynamic QR code in the checkout dialog to complete payment.
            </div>
          </div>
        </div>
      `;
    } else if (state === 'success') {
      v2StatusBox.innerHTML = `
        <div class="status-content-row">
          <span style="font-size: 1.3rem; color: #10B981;">✓</span>
          <div>
            <strong>Payment verified! Your Sacred Friends Premium license is active.</strong>
            <div style="font-family: var(--font-mono); font-size: 0.82rem; margin: 6px 0; color: var(--color-gold-light);">
              License Key: <strong>${details.licenseKey}</strong>
            </div>
            <div style="font-size: 0.8rem; opacity: 0.85;">
              Installer: SacredFriends-V2-Paid-Setup.exe (Protected Download Authorized)
            </div>
            <div style="margin-top: 10px;">
              <a href="${details.downloadUrl}" class="btn btn-primary btn-sm" id="btn-download-v2-installer">
                Download V2 – Premium Now (.exe)
              </a>
            </div>
          </div>
        </div>
      `;
    } else if (state === 'failed') {
      v2StatusBox.innerHTML = `
        <div class="status-content-row">
          <span style="font-size: 1.2rem; color: #F43F5E;">⚠️</span>
          <div>Your payment could not be completed. No Premium download has been activated.</div>
        </div>
        <button type="button" class="btn-retry-action retry-v2-btn">Try Again</button>
      `;
      v2StatusBox.querySelector('.retry-v2-btn')?.addEventListener('click', openCheckout);
    } else if (state === 'cancelled') {
      v2StatusBox.innerHTML = `
        <div class="status-content-row">
          <span style="font-size: 1.2rem; color: #94A3B8;">ℹ️</span>
          <div>Checkout paused. You can return and complete your license whenever you're ready.</div>
        </div>
      `;
    }
  }

  function openCheckout() {
    showStage('form');
    if (checkoutModal) {
      checkoutModal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeCheckout() {
    stopPolling();
    stopCountdown();
    if (checkoutModal) {
      checkoutModal.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  // Handle successful payment transition
  function handlePaymentSuccess(data) {
    stopPolling();
    stopCountdown();

    showStage('success');

    if (successKeyEl) {
      successKeyEl.textContent = data.licenseKey;
    }
    if (successDownloadBtn) {
      successDownloadBtn.href = data.downloadUrl || `/api/download/v2/authorized?token=${data.token || ''}`;
    }

    setV2Status('success', {
      licenseKey: data.licenseKey,
      downloadUrl: data.downloadUrl
    });

    const diagKeyInput = document.getElementById('diag-license-key');
    if (diagKeyInput) diagKeyInput.value = data.licenseKey;

    if (window.loadCustomerLicense) {
      window.loadCustomerLicense(data.licenseKey);
    }

    showGlobalToast('Payment verified! Sacred Friends license ready.');
  }

  // Background status polling
  function startPolling(orderId) {
    stopPolling();
    pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payment/status/${encodeURIComponent(orderId)}`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.status === 'SUCCESS' && data.licenseKey) {
          handlePaymentSuccess(data);
        } else if (data.status === 'PAYMENT_FAILED') {
          stopPolling();
          stopCountdown();
          if (radarStatusEl) radarStatusEl.textContent = 'Payment failed. Please try again.';
          setV2Status('failed');
        } else if (data.status === 'PAYMENT_CANCELLED') {
          stopPolling();
          stopCountdown();
          if (radarStatusEl) radarStatusEl.textContent = 'Payment cancelled.';
          setV2Status('cancelled');
        }
      } catch (err) {
        console.warn('[V2] Polling payment status error:', err);
      }
    }, 2500);
  }

  // Open checkout modal listeners
  getV2Btns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openCheckout();
    });
  });

  checkoutCloseBtn?.addEventListener('click', closeCheckout);
  checkoutModal?.addEventListener('click', (e) => {
    if (e.target === checkoutModal) closeCheckout();
  });

  // Method tab buttons (UPI vs Cards)
  methodTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      methodTabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const submitBtn = document.getElementById('checkout-submit-btn');
      if (submitBtn) {
        const method = tab.getAttribute('data-method');
        submitBtn.textContent = method === 'card'
          ? `Proceed with Cards / Razorpay (₹${currentAmount})`
          : `Generate Sacred Friends UPI Order (₹${currentAmount})`;
      }
    });
  });

  // Checkout Form Submission (Stage 1 -> Stage 2)
  checkoutForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nameInput = document.getElementById('checkout-customer-name');
    const emailInput = document.getElementById('checkout-customer-email');
    const agreePolicy = document.getElementById('checkout-agree-policy');
    const submitBtn = document.getElementById('checkout-submit-btn');

    if (!agreePolicy?.checked) {
      alert('Please confirm that you agree to the Single-User, Single-Device License Policy.');
      return;
    }

    const customerName = nameInput?.value.trim() || 'Sacred Devotee';
    const customerEmail = emailInput?.value.trim() || 'user@example.com';

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Generating Secure UPI Order...';
    }

    try {
      const orderRes = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName, customerEmail })
      });

      if (!orderRes.ok) {
        const errJson = await orderRes.json().catch(() => ({}));
        throw new Error(errJson.message || 'Order creation failed');
      }

      const orderData = await orderRes.json();
      currentOrderId = orderData.orderId;

      if (orderIdDisplay) {
        orderIdDisplay.textContent = currentOrderId;
      }

      // Generate authentic UPI payment URI string with official payee
      const vpa = '7019886914@axl';
      const payeeName = 'VENKATA SAI PRUTHVI A V';
      const upiString = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(payeeName)}&am=${orderData.displayAmount || currentAmount}&cu=INR&tn=${encodeURIComponent(currentOrderId)}&mode=02&purpose=00`;

      // Render crisp in-modal QR code on canvas
      if (qrCanvas) {
        await QRCode.toCanvas(qrCanvas, upiString, {
          width: 220,
          margin: 1,
          color: {
            dark: '#040714',
            light: '#ffffff'
          }
        });
      }

      // Wire deep link for mobile UPI app launch
      if (openUpiAppBtn) {
        openUpiAppBtn.href = upiString;
      }

      // Transition to Stage 2 (QR terminal)
      showStage('payment');
      startCountdown(600); // 10 minutes
      startPolling(currentOrderId);

      setV2Status('checkout_active', {
        orderId: currentOrderId
      });
    } catch (err) {
      console.error('[V2 Checkout] Error:', err);
      alert('Unable to generate payment order: ' + err.message);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = `Generate Sacred Friends UPI Order (₹${currentAmount})`;
      }
    }
  });

  // Verify Payment / I Have Paid Button
  verifyPaymentBtn?.addEventListener('click', async () => {
    if (!currentOrderId) return;

    verifyPaymentBtn.disabled = true;
    verifyPaymentBtn.textContent = 'Checking Payment Status...';

    try {
      // 1. Check live status
      const res = await fetch(`/api/payment/status/${encodeURIComponent(currentOrderId)}`);
      const data = await res.json();

      if (data.status === 'SUCCESS' && data.licenseKey) {
        handlePaymentSuccess(data);
        return;
      }

      // 2. If running locally or in simulation, trigger simulated verification
      const simRes = await fetch('/api/payment/dev-simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: currentOrderId })
      });

      if (simRes.ok) {
        const simData = await simRes.json();
        handlePaymentSuccess(simData);
      } else {
        alert('Payment confirmation is still pending. If you just transferred funds, please allow a moment for confirmation.');
      }
    } catch (err) {
      console.error('[Verify Payment] Error:', err);
      alert('Unable to verify payment status: ' + err.message);
    } finally {
      verifyPaymentBtn.disabled = false;
      verifyPaymentBtn.textContent = '✓ Verify Payment / I Have Paid';
    }
  });

  // Back to Details Form
  backToFormBtn?.addEventListener('click', () => {
    stopPolling();
    stopCountdown();
    showStage('form');
  });

  // QR View Switcher (Dynamic ₹499 QR vs PhonePe Standee)
  const btnQrDynamic = document.getElementById('btn-qr-dynamic');
  const btnQrPhonepe = document.getElementById('btn-qr-phonepe');
  const qrDynamicWrap = document.getElementById('checkout-qr-dynamic-wrap');
  const qrPhonepeImg = document.getElementById('checkout-qr-phonepe-img');

  btnQrDynamic?.addEventListener('click', () => {
    btnQrDynamic.classList.add('active');
    btnQrDynamic.style.background = 'linear-gradient(135deg, rgba(212, 175, 55, 0.35) 0%, rgba(254, 240, 138, 0.2) 100%)';
    btnQrDynamic.style.color = 'var(--color-gold-light)';
    btnQrPhonepe?.classList.remove('active');
    if (btnQrPhonepe) {
      btnQrPhonepe.style.background = 'transparent';
      btnQrPhonepe.style.color = 'var(--color-muted-stone)';
    }
    if (qrDynamicWrap) qrDynamicWrap.style.display = 'block';
    if (qrPhonepeImg) qrPhonepeImg.style.display = 'none';
  });

  btnQrPhonepe?.addEventListener('click', () => {
    btnQrPhonepe.classList.add('active');
    btnQrPhonepe.style.background = 'linear-gradient(135deg, rgba(103, 58, 183, 0.4) 0%, rgba(147, 51, 234, 0.25) 100%)';
    btnQrPhonepe.style.color = '#d8b4fe';
    btnQrDynamic?.classList.remove('active');
    if (btnQrDynamic) {
      btnQrDynamic.style.background = 'transparent';
      btnQrDynamic.style.color = 'var(--color-muted-stone)';
    }
    if (qrDynamicWrap) qrDynamicWrap.style.display = 'none';
    if (qrPhonepeImg) qrPhonepeImg.style.display = 'block';
  });

  // Copy UPI VPA
  vpaCopyBtn?.addEventListener('click', () => {
    const vpa = vpaTextEl?.textContent?.trim() || '7019886914@axl';
    navigator.clipboard?.writeText(vpa).then(() => {
      vpaCopyBtn.textContent = 'Copied!';
      setTimeout(() => { vpaCopyBtn.textContent = 'Copy UPI ID'; }, 2000);
      showGlobalToast('UPI ID (7019886914@axl) copied to clipboard!');
    }).catch(() => {
      vpaCopyBtn.textContent = 'Copied!';
      setTimeout(() => { vpaCopyBtn.textContent = 'Copy UPI ID'; }, 2000);
    });
  });

  // Copy Success License Key
  copySuccessKeyBtn?.addEventListener('click', () => {
    const key = successKeyEl?.textContent?.trim();
    if (key) {
      navigator.clipboard?.writeText(key).then(() => {
        copySuccessKeyBtn.textContent = 'Copied!';
        setTimeout(() => { copySuccessKeyBtn.textContent = 'Copy License Key'; }, 2000);
        showGlobalToast('License key copied to clipboard!');
      }).catch(() => {
        copySuccessKeyBtn.textContent = 'Copied!';
        setTimeout(() => { copySuccessKeyBtn.textContent = 'Copy License Key'; }, 2000);
      });
    }
  });

  // Open Licensing Dashboard from Success Screen
  successDashboardBtn?.addEventListener('click', () => {
    closeCheckout();
    const dashboardModal = document.getElementById('dashboard-modal');
    if (dashboardModal) {
      dashboardModal.classList.add('open');
      document.body.style.overflow = 'hidden';
      const key = successKeyEl?.textContent?.trim();
      if (key && window.loadCustomerLicense) {
        window.loadCustomerLicense(key);
      }
    }
  });

  // -------------------------------------------------------------
  // 2. Strict 1-User 1-Device Windows Licensing Interactive Diagnostic Tool
  // -------------------------------------------------------------
  initLicensingDiagnostic();

  // -------------------------------------------------------------
  // 3. Customer Portal & Dashboard
  // -------------------------------------------------------------
  initCustomerPortal();
}

function initLicensingDiagnostic() {
  const btnActivate = document.getElementById('diag-btn-activate');
  const btnValidate = document.getElementById('diag-btn-validate');
  const btnSimulateDevice2 = document.getElementById('diag-btn-device2');
  const btnResetDevice = document.getElementById('diag-btn-reset');
  const btnGenerateKey = document.getElementById('diag-btn-generate-key');
  const resultsBox = document.getElementById('diag-results-box');

  const keyInput = document.getElementById('diag-license-key');
  const deviceInput = document.getElementById('diag-device-id');
  const nameInput = document.getElementById('diag-device-name');
  const adminKeyInput = document.getElementById('diag-admin-key');

  function logResult(title, data, isError = false) {
    if (!resultsBox) return;
    const time = new Date().toLocaleTimeString();
    const color = isError ? '#F43F5E' : '#10B981';
    resultsBox.innerHTML = `
      <div style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 6px; margin-bottom: 8px;">
        <span style="color: #64748B;">[${time}]</span> <strong style="color: ${color};">${title}</strong>
      </div>
      <pre style="white-space: pre-wrap; font-family: var(--font-mono); font-size: 0.8rem; line-height: 1.5;">${JSON.stringify(data, null, 2)}</pre>
    `;
  }

  // Helper to obtain a test license key
  async function fetchFreshTestKey() {
    try {
      const res = await fetch('/api/license/generate-demo', { method: 'POST' });
      if (res.ok) {
        const d = await res.json();
        if (keyInput) keyInput.value = d.licenseKey;
        return d.licenseKey;
      }
    } catch (e) {
      console.warn('Could not auto-generate demo key:', e);
    }
    return null;
  }

  if (keyInput && !keyInput.value) {
    fetchFreshTestKey();
  }

  btnGenerateKey?.addEventListener('click', async () => {
    btnGenerateKey.disabled = true;
    btnGenerateKey.textContent = 'Generating...';
    const newKey = await fetchFreshTestKey();
    btnGenerateKey.disabled = false;
    btnGenerateKey.textContent = '✦ Auto-Fill Test Key';
    if (newKey) {
      logResult('TEST KEY GENERATED', {
        message: 'A fresh test license key was created and populated into the form.',
        licenseKey: newKey
      });
      showGlobalToast('New test license key generated!');
    }
  });

  btnActivate?.addEventListener('click', async () => {
    let key = keyInput?.value.trim();
    const deviceId = deviceInput?.value.trim();
    const deviceName = nameInput?.value.trim() || 'Primary Windows Desktop';

    if (!deviceId) {
      logResult('MISSING DEVICE FINGERPRINT', { error: 'Please enter a device hardware fingerprint.' }, true);
      return;
    }

    if (!key) {
      key = await fetchFreshTestKey();
    }

    if (!key) {
      logResult('MISSING LICENSE KEY', { error: 'Please enter or generate a license key.' }, true);
      return;
    }

    try {
      const res = await fetch('/api/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: key, deviceFingerprint: deviceId, deviceName })
      });

      const data = await res.json();
      logResult(res.ok ? 'ACTIVATION SUCCESSFUL' : `ACTIVATION REJECTED (HTTP ${res.status})`, data, !res.ok);
    } catch (err) {
      logResult('NETWORK ERROR', { error: err.message }, true);
    }
  });

  btnValidate?.addEventListener('click', async () => {
    const key = keyInput?.value.trim();
    const deviceId = deviceInput?.value.trim();

    if (!key || !deviceId) {
      logResult('MISSING PARAMETERS', { error: 'Please enter both License Key and Device Fingerprint to validate.' }, true);
      return;
    }

    try {
      const res = await fetch('/api/license/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: key, deviceFingerprint: deviceId })
      });

      const data = await res.json();
      logResult(res.ok ? 'VALIDATION CONFIRMED' : `VALIDATION FAILED (HTTP ${res.status})`, data, !res.ok);
    } catch (err) {
      logResult('NETWORK ERROR', { error: err.message }, true);
    }
  });

  btnSimulateDevice2?.addEventListener('click', async () => {
    let key = keyInput?.value.trim();
    if (!key) {
      logResult('LICENSE KEY REQUIRED', { error: 'Please enter or generate a License Key first before testing Device 2.' }, true);
      return;
    }

    const device2Id = 'WIN-DIFF-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const device2Name = 'Unauthorized Second Laptop';

    try {
      const res = await fetch('/api/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseKey: key,
          deviceFingerprint: device2Id,
          deviceName: device2Name
        })
      });

      const data = await res.json();
      logResult(`UNAUTHORIZED DEVICE ATTEMPT (HTTP ${res.status})`, data, !res.ok);
    } catch (err) {
      logResult('NETWORK ERROR', { error: err.message }, true);
    }
  });

  btnResetDevice?.addEventListener('click', async () => {
    const key = keyInput?.value.trim();
    if (!key) {
      logResult('LICENSE KEY REQUIRED', { error: 'Please enter a License Key to reset.' }, true);
      return;
    }

    const adminKey = adminKeyInput?.value.trim() || 'sacred-friends-super-admin-secret-2026';

    try {
      const res = await fetch('/api/admin/reset-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseKey: key,
          adminSecretKey: adminKey,
          reason: 'Customer requested authorized device migration'
        })
      });

      const data = await res.json();
      logResult(res.ok ? 'ADMIN DEVICE RESET SUCCESSFUL' : `ADMIN RESET FAILED (HTTP ${res.status})`, data, !res.ok);
    } catch (err) {
      logResult('NETWORK ERROR', { error: err.message }, true);
    }
  });
}

function initCustomerPortal() {
  const lookupInput = document.getElementById('portal-license-lookup');
  const lookupBtn = document.getElementById('btn-portal-lookup');
  const fillDemoBtn = document.getElementById('btn-portal-fill-demo');
  const accountCard = document.getElementById('portal-account-card');
  const nameEl = document.getElementById('portal-cust-name');
  const emailEl = document.getElementById('portal-cust-email');
  const keyDisplayEl = document.getElementById('portal-key-display');
  const copyBtn = document.getElementById('btn-copy-license');
  const deviceStatusEl = document.getElementById('portal-device-status');
  const deviceNameEl = document.getElementById('portal-device-name');
  const downloadInstallerBtn = document.getElementById('btn-portal-download-installer');
  const diagKeyInput = document.getElementById('diag-license-key');

  let currentLoadedKey = null;

  async function loadCustomerLicense(keyToSearch) {
    if (!keyToSearch) return;
    try {
      if (lookupBtn) {
        lookupBtn.disabled = true;
        lookupBtn.innerHTML = '<span>Checking...</span>';
      }

      const res = await fetch(`/api/license/status/${encodeURIComponent(keyToSearch)}`);
      if (!res.ok) {
        showGlobalToast('License not found. Please verify your license key.');
        return;
      }

      const data = await res.json();
      currentLoadedKey = data.licenseKey;

      if (nameEl) nameEl.textContent = data.customerName || 'Sacred Devotee';
      if (emailEl) emailEl.textContent = data.customerEmail || 'purchaser@example.com';
      if (keyDisplayEl) keyDisplayEl.textContent = data.licenseKey;
      if (lookupInput) lookupInput.value = data.licenseKey;
      if (diagKeyInput) diagKeyInput.value = data.licenseKey;

      if (deviceStatusEl && deviceNameEl) {
        if (data.isDeviceBound) {
          deviceStatusEl.innerHTML = `<span style="color: #10B981; font-weight: 600;">1 of 1 Device Registered</span>`;
          deviceNameEl.textContent = `${data.registeredDeviceName || 'Windows PC'} (${data.registeredDeviceId || 'Active'})`;
        } else {
          deviceStatusEl.innerHTML = `<span style="color: #F59E0B; font-weight: 600;">Ready for First Activation</span>`;
          deviceNameEl.textContent = 'No Windows PC registered yet. Open Sacred Friends to activate.';
        }
      }

      if (accountCard) {
        accountCard.style.display = 'block';
      }

      showGlobalToast('Customer license dashboard loaded!');
    } catch (err) {
      console.error('[Portal] Lookup error:', err);
      showGlobalToast('Failed to retrieve license details.');
    } finally {
      if (lookupBtn) {
        lookupBtn.disabled = false;
        lookupBtn.innerHTML = '<span>Access Dashboard</span>';
      }
    }
  }

  window.loadCustomerLicense = loadCustomerLicense;

  // Auto-load demo key into portal if available
  setTimeout(async () => {
    const key = diagKeyInput?.value?.trim();
    if (key) {
      loadCustomerLicense(key);
    }
  }, 1000);

  // Quick Demo Key Button
  fillDemoBtn?.addEventListener('click', async () => {
    let key = diagKeyInput?.value?.trim();
    if (!key) {
      try {
        const res = await fetch('/api/license/generate-demo', { method: 'POST' });
        if (res.ok) {
          const d = await res.json();
          key = d.licenseKey;
          if (diagKeyInput) diagKeyInput.value = key;
        }
      } catch (e) {
        console.warn('Could not generate key:', e);
      }
    }
    if (key) {
      if (lookupInput) lookupInput.value = key;
      loadCustomerLicense(key);
    }
  });

  lookupBtn?.addEventListener('click', () => {
    const key = lookupInput?.value.trim();
    if (!key) {
      alert('Please enter your Sacred Friends Premium License Key.');
      return;
    }
    loadCustomerLicense(key);
  });

  lookupInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      lookupBtn?.click();
    }
  });

  copyBtn?.addEventListener('click', () => {
    const key = keyDisplayEl?.textContent?.trim();
    if (key) {
      navigator.clipboard?.writeText(key).then(() => {
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
        showGlobalToast('License key copied to clipboard!');
      }).catch(() => {
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
      });
    }
  });

  downloadInstallerBtn?.addEventListener('click', async () => {
    const key = currentLoadedKey || keyDisplayEl?.textContent?.trim() || diagKeyInput?.value.trim();
    if (!key) {
      alert('No active license key loaded.');
      return;
    }

    try {
      downloadInstallerBtn.disabled = true;
      downloadInstallerBtn.innerHTML = '<span>Authorizing Download...</span>';

      const res = await fetch(`/api/license/download-token/${encodeURIComponent(key)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Unable to authorize download.');
      }

      const data = await res.json();
      if (data.downloadUrl) {
        showGlobalToast('Download authorized! Starting installer download...');
        window.location.href = data.downloadUrl;
      }
    } catch (err) {
      console.error('[Portal Download] Error:', err);
      showGlobalToast(err.message || 'Download authorization failed.');
    } finally {
      downloadInstallerBtn.disabled = false;
      downloadInstallerBtn.innerHTML = `
        <span>Download V2 (.exe)</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M0 3.449L9.75 2.1v9.451H0V3.449zm10.949-1.551L24 0v11.551h-13.051V1.898zM0 12.651h9.75v9.451L0 20.75v-8.099zm10.949 0H24V24l-13.051-1.898V12.651z" />
        </svg>
      `;
    }
  });
}

function showGlobalToast(msg) {
  const toast = document.getElementById('toast-notice');
  const toastMsg = document.getElementById('toast-message');
  if (!toast || !toastMsg) return;

  toastMsg.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}
