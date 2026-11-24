/**
 * Sacred Friends V2 – Premium Commerce & Licensing Engine
 * Handles Razorpay checkout, backend payment signature verification,
 * short-lived protected download authorization, and 1-User 1-Device testing.
 */

export function initV2Commerce() {
  const getV2Btns = document.querySelectorAll('.action-get-v2');
  const v2StatusBox = document.getElementById('v2-status-box');
  const checkoutModal = document.getElementById('checkout-modal');
  const checkoutCloseBtn = document.getElementById('checkout-close-btn');
  const checkoutForm = document.getElementById('v2-checkout-form');
  const priceDisplay = document.getElementById('v2-display-price');

  let activeConfig = null;

  // 1. Fetch public config from backend
  async function loadConfig() {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        activeConfig = await res.json();
        if (priceDisplay) {
          if (activeConfig.v2.isPriceConfigured && activeConfig.v2.price !== null) {
            priceDisplay.textContent = `${activeConfig.v2.currency === 'INR' ? '₹' : '$'}${activeConfig.v2.price}`;
          } else {
            priceDisplay.textContent = 'Price TBA';
            const priceBlock = document.getElementById('v2-price-container');
            if (priceBlock) {
              const notice = document.createElement('div');
              notice.style.fontSize = '0.82rem';
              notice.style.color = '#F59E0B';
              notice.textContent = 'Premium price is not yet available.';
              priceBlock.appendChild(notice);
            }
          }
        }
      }
    } catch (err) {
      console.warn('[V2] Config fetch failed:', err);
    }
  }
  loadConfig();

  // Status updates
  function setV2Status(state, details = {}) {
    if (!v2StatusBox) return;

    v2StatusBox.className = 'action-status-box show ' + state;

    if (state === 'opening') {
      v2StatusBox.innerHTML = `
        <div class="status-content-row">
          <div class="status-spinner"></div>
          <div>Opening secure checkout...</div>
        </div>
      `;
    } else if (state === 'checkout_active') {
      v2StatusBox.innerHTML = `
        <div class="status-content-row">
          <div class="status-spinner"></div>
          <div>
            <strong>YouPI-PG Sovereign UPI Checkout Active</strong>
            <div style="font-size: 0.82rem; margin: 4px 0; color: var(--color-soft-cream);">
              Order: <span style="font-family: var(--font-mono); color: var(--color-gold-light);">${details.orderId || ''}</span> • Amount: ₹499
            </div>
            <div style="font-size: 0.8rem; color: #94A3B8; margin-bottom: 8px;">
              Complete your UPI payment in the YouPI portal window. This page will update automatically upon verification.
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px;">
              <a href="${details.checkoutUrl || '#'}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">
                Open UPI QR Portal ↗
              </a>
              <button type="button" class="btn btn-secondary btn-sm retry-v2-btn" style="padding: 4px 10px; font-size: 0.75rem;">
                Cancel
              </button>
            </div>
          </div>
        </div>
      `;
      v2StatusBox.querySelector('.retry-v2-btn')?.addEventListener('click', () => {
        stopPolling();
        setV2Status('cancelled');
      });
    } else if (state === 'pending') {
      v2StatusBox.innerHTML = `
        <div class="status-content-row">
          <div class="status-spinner"></div>
          <div>Your payment is being verified. Please wait.</div>
        </div>
      `;
    } else if (state === 'success') {
      v2StatusBox.innerHTML = `
        <div class="status-content-row">
          <span style="font-size: 1.3rem; color: #10B981;">✓</span>
          <div>
            <strong>Payment successful! Your Sacred Friends Premium license is ready.</strong>
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
          <div>Payment cancelled. You can return and try again whenever you're ready.</div>
        </div>
      `;
    } else if (state === 'verification_unavailable') {
      v2StatusBox.innerHTML = `
        <div class="status-content-row">
          <span style="font-size: 1.2rem; color: #F59E0B;">⏳</span>
          <div>We couldn't verify your payment yet. Please check again later. Do not make another payment until the status is confirmed.</div>
        </div>
      `;
    } else if (state === 'device_mismatch') {
      v2StatusBox.innerHTML = `
        <div class="status-content-row">
          <span style="font-size: 1.2rem; color: #F43F5E;">🔒</span>
          <div>This Sacred Friends Premium license is already registered to another device. Only the original purchaser can use this license on their registered device. Please contact support if you need assistance.</div>
        </div>
      `;
    } else if (state === 'installer_unavailable') {
      v2StatusBox.innerHTML = `
        <div class="status-content-row">
          <span style="font-size: 1.2rem; color: #F59E0B;">⚠️</span>
          <div>Your payment is verified, but the installer is temporarily unavailable. Your purchase remains valid. Please try again later.</div>
        </div>
      `;
    }
  }

  function openCheckout() {
    if (!activeConfig || !activeConfig.v2.isPriceConfigured) {
      setV2Status('error', {
        message: 'Sacred Friends V2 Premium price is not yet available. Please check back later.'
      });
      return;
    }

    setV2Status('opening');
    if (checkoutModal) {
      checkoutModal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeCheckout() {
    if (checkoutModal) {
      checkoutModal.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  getV2Btns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openCheckout();
    });
  });

  checkoutCloseBtn?.addEventListener('click', () => {
    closeCheckout();
    setV2Status('cancelled');
  });

  checkoutModal?.addEventListener('click', (e) => {
    if (e.target === checkoutModal) {
      closeCheckout();
      setV2Status('cancelled');
    }
  });

  let pollInterval = null;

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  function startPolling(orderId) {
    stopPolling();
    pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payment/status/${encodeURIComponent(orderId)}`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.status === 'SUCCESS' && data.licenseKey) {
          stopPolling();
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
        } else if (data.status === 'VERIFICATION_PENDING') {
          setV2Status('verification_unavailable');
        } else if (data.status === 'PAYMENT_FAILED') {
          stopPolling();
          setV2Status('failed');
        } else if (data.status === 'PAYMENT_CANCELLED') {
          stopPolling();
          setV2Status('cancelled');
        }
      } catch (err) {
        console.warn('[V2] Polling payment status error:', err);
      }
    }, 2500);
  }

  // Handle Checkout Submission via YouPI-PG
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

    const customerName = nameInput?.value.trim() || 'Devoted Customer';
    const customerEmail = emailInput?.value.trim() || 'user@example.com';

    closeCheckout();
    setV2Status('opening');

    if (submitBtn) {
      submitBtn.disabled = true;
    }

    try {
      // 1. Create order on backend via YouPI-PG
      const orderRes = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName, customerEmail })
      });

      if (!orderRes.ok) {
        const errorJson = await orderRes.json().catch(() => ({}));
        throw new Error(errorJson.message || 'Order creation failed');
      }

      const orderData = await orderRes.json();

      // 2. Display YouPI-PG active checkout state
      setV2Status('checkout_active', {
        orderId: orderData.orderId,
        checkoutUrl: orderData.checkoutUrl
      });

      // Automatically launch checkout portal in new tab
      if (orderData.checkoutUrl) {
        window.open(orderData.checkoutUrl, '_blank');
      }

      // 3. Start authoritative status polling
      startPolling(orderData.orderId);
    } catch (err) {
      console.error('[V2 Checkout] Error:', err);
      setV2Status('failed');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
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

  // Pre-fill a test key on page load if currently empty
  if (keyInput && !keyInput.value) {
    fetchFreshTestKey();
  }

  // Manual Auto-Fill Button
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

  // 1. Activate on Current Device
  btnActivate?.addEventListener('click', async () => {
    let key = keyInput?.value.trim();
    const deviceId = deviceInput?.value.trim();
    const deviceName = nameInput?.value.trim() || 'Primary Windows Desktop';

    if (!deviceId) {
      logResult('MISSING DEVICE FINGERPRINT', { error: 'Please enter a device hardware fingerprint.' }, true);
      return;
    }

    if (!key) {
      // Auto-generate test key on the fly if user clicks without key
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

  // 2. Validate Heartbeat
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

  // 3. Simulate Device 2 (Test Strict 1-Device Rejection)
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

  // 4. Admin Reset Device Binding
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
        <span>Download V2 Installer (.exe)</span>
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

