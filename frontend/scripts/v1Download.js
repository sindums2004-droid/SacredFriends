/**
 * Sacred Friends V1 – Free Download Engine
 * Real download states, installer verification, and stream triggering
 */

export function initV1Download() {
  const v1Btns = document.querySelectorAll('.action-download-v1');
  const statusBoxes = document.querySelectorAll('.v1-status-box');

  function setStatus(state, details = {}) {
    statusBoxes.forEach((box) => {
      box.className = 'action-status-box show ' + state;

      if (state === 'preparing') {
        box.innerHTML = `
          <div class="status-content-row">
            <div class="status-spinner"></div>
            <div>Preparing your Sacred Friends V1 download...</div>
          </div>
        `;
      } else if (state === 'success') {
        box.innerHTML = `
          <div class="status-content-row">
            <span style="font-size: 1.2rem; color: #10B981;">✓</span>
            <div>
              <strong>Your Sacred Friends V1 download has started.</strong>
              <div style="font-family: var(--font-mono); font-size: 0.78rem; margin-top: 4px; opacity: 0.85;">
                Filename: ${details.filename || 'SacredFriends-V1-Free-Setup.exe'}
              </div>
            </div>
          </div>
        `;
      } else if (state === 'error') {
        box.innerHTML = `
          <div class="status-content-row">
            <span style="font-size: 1.2rem; color: #F43F5E;">⚠️</span>
            <div>${details.message || 'Unable to download Sacred Friends V1. Please check your internet connection and try again.'}</div>
          </div>
          <button type="button" class="btn-retry-action retry-v1-btn">Try Again</button>
        `;
        box.querySelector('.retry-v1-btn')?.addEventListener('click', triggerV1Download);
      } else if (state === 'unavailable') {
        box.innerHTML = `
          <div class="status-content-row">
            <span style="font-size: 1.2rem; color: #F59E0B;">ℹ️</span>
            <div>The V1 installer is temporarily unavailable. Please try again later.</div>
          </div>
        `;
      }
    });
  }

  async function triggerV1Download() {
    v1Btns.forEach((btn) => {
      btn.disabled = true;
      btn.style.opacity = '0.6';
      btn.style.pointerEvents = 'none';
    });

    setStatus('preparing');

    try {
      // 1. Verify availability with backend status check
      const statusRes = await fetch('/api/download/v1/status');

      if (statusRes.status === 404) {
        setStatus('unavailable');
        restoreButtons();
        return;
      }

      if (!statusRes.ok) {
        throw new Error('HTTP ' + statusRes.status);
      }

      const statusData = await statusRes.json();
      if (!statusData.available) {
        setStatus('unavailable');
        restoreButtons();
        return;
      }

      // 2. Initiate actual download via direct URL
      const downloadUrl = '/api/download/v1';
      const hiddenLink = document.createElement('a');
      hiddenLink.href = downloadUrl;
      hiddenLink.setAttribute('download', 'SacredFriends-V1-Free-Setup.exe');
      document.body.appendChild(hiddenLink);
      hiddenLink.click();
      document.body.removeChild(hiddenLink);

      // Download successfully triggered
      setStatus('success', { filename: 'SacredFriends-V1-Free-Setup.exe' });

      showGlobalToast('Starting download: SacredFriends-V1-Free-Setup.exe');
    } catch (err) {
      console.error('[V1 Download] Error:', err);
      setStatus('error', {
        message: 'Unable to download Sacred Friends V1. Please check your internet connection and try again.'
      });
    } finally {
      setTimeout(restoreButtons, 3000);
    }
  }

  function restoreButtons() {
    v1Btns.forEach((btn) => {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
    });
  }

  v1Btns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      triggerV1Download();
    });
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

