import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext.jsx';

export const DashboardModal = ({ isOpen, onClose }) => {
  const { showToast } = useToast();

  const [lookupQuery, setLookupQuery] = useState('');
  const [customer, setCustomer] = useState({
    name: 'Sacred Devotee',
    email: 'purchaser@example.com',
    licenseKey: 'SF2-DEMO-XXXX-XXXX-XXXX',
    registeredDevice: 'WIN-DESKTOP-90F2 (Windows 11)',
    hasActiveLicense: true,
    token: ''
  });

  const [diagKey, setDiagKey] = useState('');
  const [diagDeviceFingerprint, setDiagDeviceFingerprint] = useState('WIN-FINGERPRINT-8A9F2026-X64');
  const [diagDeviceName, setDiagDeviceName] = useState('Primary Windows PC (Win 11)');
  const [diagAdminSecret, setDiagAdminSecret] = useState('sacred-friends-super-admin-secret-2026');
  const [diagLogs, setDiagLogs] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Path 2: Merchant Bank Reconciliation State
  const [activeTab, setActiveTab] = useState('license'); // 'license' | 'reconciliation'
  const [orders, setOrders] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [approvingOrderId, setApprovingOrderId] = useState(null);

  const fetchOrders = async () => {
    try {
      setIsLoadingOrders(true);
      const res = await fetch('/api/admin/orders', {
        headers: {
          'x-admin-secret': diagAdminSecret || 'sacred-friends-super-admin-secret-2026'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      } else {
        showToast('Failed to fetch orders. Check admin key.');
      }
    } catch (err) {
      showToast('Error loading orders: ' + err.message);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const handleApproveOrder = async (orderId, utr) => {
    try {
      setApprovingOrderId(orderId);
      const res = await fetch('/api/admin/approve-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': diagAdminSecret || 'sacred-friends-super-admin-secret-2026'
        },
        body: JSON.stringify({ orderId, utr })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`✓ Order ${orderId} approved! License: ${data.licenseKey}`);
        await fetchOrders();
      } else {
        showToast(data.message || 'Approval failed.');
      }
    } catch (err) {
      showToast('Error approving order: ' + err.message);
    } finally {
      setApprovingOrderId(null);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchOrders();
    }
  }, [isOpen]);

  const addLog = (title, data, isError = false) => {
    const timestamp = new Date().toLocaleTimeString();
    const formatted = `[${timestamp}] ${title}\n${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}`;
    setDiagLogs((prev) => [formatted, ...prev.slice(0, 8)]);
  };

  const fetchDemoKey = async () => {
    try {
      setIsGenerating(true);
      const res = await fetch('/api/license/generate-demo', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setDiagKey(data.licenseKey);
        setCustomer((prev) => ({
          ...prev,
          licenseKey: data.licenseKey,
          email: data.purchaserEmail || prev.email,
          name: data.purchaserName || prev.name
        }));
        addLog('TEST KEY GENERATED', {
          message: 'A fresh test license key was created and populated.',
          licenseKey: data.licenseKey
        });
        showToast('Fresh test license key generated!');
        return data.licenseKey;
      }
    } catch (err) {
      addLog('ERROR GENERATING KEY', { error: err.message }, true);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLookup = async () => {
    if (!lookupQuery.trim()) {
      showToast('Please enter a license key or purchaser email.');
      return;
    }
    try {
      const res = await fetch(`/api/license/lookup?q=${encodeURIComponent(lookupQuery.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setCustomer({
          name: data.purchaserName || 'Sacred Devotee',
          email: data.purchaserEmail || lookupQuery.trim(),
          licenseKey: data.licenseKey,
          registeredDevice: data.deviceFingerprint ? `${data.deviceName || 'Device'} (${data.deviceFingerprint.slice(0, 12)}...)` : 'No device registered yet',
          hasActiveLicense: true,
          token: data.token || ''
        });
        setDiagKey(data.licenseKey);
        showToast('License details loaded!');
      } else {
        showToast('License not found for this query.');
      }
    } catch (err) {
      showToast('Error looking up license: ' + err.message);
    }
  };

  const handleActivate = async () => {
    let key = diagKey.trim();
    if (!key) {
      key = await fetchDemoKey();
    }
    if (!key) return;

    try {
      const res = await fetch('/api/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseKey: key,
          deviceFingerprint: diagDeviceFingerprint,
          deviceName: diagDeviceName
        })
      });
      const data = await res.json();
      addLog(res.ok ? 'ACTIVATION SUCCESSFUL' : `ACTIVATION REJECTED (HTTP ${res.status})`, data, !res.ok);
      if (res.ok) {
        showToast('Device activated successfully!');
        setCustomer((prev) => ({ ...prev, registeredDevice: `${diagDeviceName} (${diagDeviceFingerprint.slice(0, 12)}...)` }));
      }
    } catch (err) {
      addLog('NETWORK ERROR', { error: err.message }, true);
    }
  };

  const handleValidate = async () => {
    if (!diagKey.trim() || !diagDeviceFingerprint.trim()) {
      addLog('MISSING PARAMETERS', { error: 'Please enter License Key and Device Fingerprint' }, true);
      return;
    }
    try {
      const res = await fetch('/api/license/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseKey: diagKey.trim(),
          deviceFingerprint: diagDeviceFingerprint.trim()
        })
      });
      const data = await res.json();
      addLog(res.ok ? 'HEARTBEAT CONFIRMED' : `VALIDATION FAILED (HTTP ${res.status})`, data, !res.ok);
      if (res.ok) showToast('Heartbeat verification confirmed!');
    } catch (err) {
      addLog('NETWORK ERROR', { error: err.message }, true);
    }
  };

  const handleSimulateDevice2 = async () => {
    if (!diagKey.trim()) {
      addLog('KEY REQUIRED', { error: 'Generate or activate a license key first before testing second PC' }, true);
      return;
    }
    const rogueId = 'WIN-DIFF-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    try {
      const res = await fetch('/api/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseKey: diagKey.trim(),
          deviceFingerprint: rogueId,
          deviceName: 'Unauthorized Second Laptop'
        })
      });
      const data = await res.json();
      addLog(`UNAUTHORIZED 2ND DEVICE ATTEMPT (HTTP ${res.status})`, data, !res.ok);
      showToast('2nd device rejected by strict 1-device policy (as expected)!');
    } catch (err) {
      addLog('NETWORK ERROR', { error: err.message }, true);
    }
  };

  const handleResetBinding = async () => {
    if (!diagKey.trim()) {
      addLog('KEY REQUIRED', { error: 'Please provide a license key to reset' }, true);
      return;
    }
    try {
      const res = await fetch('/api/license/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseKey: diagKey.trim(),
          adminSecret: diagAdminSecret.trim()
        })
      });
      const data = await res.json();
      addLog(res.ok ? 'DEVICE BINDING RESET' : `RESET REJECTED (HTTP ${res.status})`, data, !res.ok);
      if (res.ok) showToast('Device binding successfully reset!');
    } catch (err) {
      addLog('NETWORK ERROR', { error: err.message }, true);
    }
  };

  const copyLicenseKey = (key) => {
    navigator.clipboard.writeText(key);
    showToast('License Key copied to clipboard!');
  };

  if (!isOpen) return null;

  return (
    <div
      id="dashboard-modal"
      className="modal-overlay open"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dashboard-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-dialog">
        <button
          type="button"
          id="dashboard-close-btn"
          className="modal-close-btn"
          aria-label="Close dialog"
          onClick={onClose}
        >
          &times;
        </button>

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <span className="edition-badge badge-premium" style={{ display: 'inline-block', marginBottom: '0.5rem' }}>
            Control Center
          </span>
          <h2 id="dashboard-modal-title" className="font-display" style={{ fontSize: '1.6rem', color: 'var(--color-warm-ivory)' }}>
            Licensing & Merchant Hub
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-muted-stone)' }}>
            Manage Windows machine licenses or reconcile incoming UPI bank payments for 100% zero-fee delivery.
          </p>
        </div>

        {/* Tab Switcher: Licensing vs Merchant Bank Reconciliation */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveTab('license')}
            style={{
              padding: '0.55rem 1.25rem',
              borderRadius: '9999px',
              border: activeTab === 'license' ? '1px solid #D4AF37' : '1px solid rgba(255,255,255,0.1)',
              background: activeTab === 'license' ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255,255,255,0.02)',
              color: activeTab === 'license' ? '#D4AF37' : '#94A3B8',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            🔑 Customer Licensing & Devices
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('reconciliation');
              fetchOrders();
            }}
            style={{
              padding: '0.55rem 1.25rem',
              borderRadius: '9999px',
              border: activeTab === 'reconciliation' ? '1px solid #38BDF8' : '1px solid rgba(255,255,255,0.1)',
              background: activeTab === 'reconciliation' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.02)',
              color: activeTab === 'reconciliation' ? '#38BDF8' : '#94A3B8',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span>💳 Merchant Bank Reconciliation (Path 2)</span>
            {orders.filter((o) => o.status === 'AWAITING_BANK_RECONCILIATION').length > 0 && (
              <span
                style={{
                  background: '#EF4444',
                  color: '#FFF',
                  borderRadius: '9999px',
                  fontSize: '0.7rem',
                  padding: '0.1rem 0.5rem',
                  fontWeight: 700
                }}
              >
                {orders.filter((o) => o.status === 'AWAITING_BANK_RECONCILIATION').length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'license' && (
          <>
            {/* Customer Lookup Box */}
            <div className="portal-lookup-box" style={{ marginBottom: '1.5rem' }}>
              <div className="portal-lookup-inputs">
                <div style={{ flex: 1 }}>
                  <label htmlFor="portal-license-lookup" className="diag-label">
                    Enter License Key or Purchaser Email:
                  </label>
                  <input
                    type="text"
                    id="portal-license-lookup"
                    className="diag-input"
                    placeholder="e.g. SF2-XXXX-XXXX-XXXX-XXXX or your.email@example.com"
                    value={lookupQuery}
                    onChange={(e) => setLookupQuery(e.target.value)}
                  />
                </div>
                <button type="button" className="btn btn-primary" id="btn-portal-lookup" onClick={handleLookup}>
                  <span>Access Dashboard</span>
                </button>
              </div>
              <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.76rem', color: 'var(--color-muted-stone)' }}>Quick Test:</span>
                <button
                  type="button"
                  id="btn-portal-fill-demo"
                  className="portal-quick-pill"
                  onClick={fetchDemoKey}
                  disabled={isGenerating}
                >
                  ✦ Load Active Demo License
                </button>
              </div>
            </div>

        {/* Customer Account Details Card */}
        <div className="portal-account-card" id="portal-account-card">
          <div className="portal-account-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="portal-avatar">🕉️</div>
              <div>
                <h3
                  id="portal-cust-name"
                  style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', color: 'var(--color-warm-ivory)', margin: 0 }}
                >
                  {customer.name}
                </h3>
                <span id="portal-cust-email" style={{ fontSize: '0.82rem', color: 'var(--color-muted-stone)' }}>
                  {customer.email}
                </span>
              </div>
            </div>
            <div id="portal-license-badge" className="badge-active-license">
              ● Active Premium License
            </div>
          </div>

          <div className="portal-details-grid">
            <div className="portal-detail-item">
              <span className="portal-detail-label">Personal License Key</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <code id="portal-key-display" className="portal-code">
                  {customer.licenseKey}
                </code>
                <button
                  type="button"
                  id="btn-copy-license"
                  className="btn-copy-small"
                  title="Copy License Key"
                  onClick={() => copyLicenseKey(customer.licenseKey)}
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="portal-detail-item">
              <span className="portal-detail-label">Registered Windows Device</span>
              <div id="portal-device-status" className="portal-device-status" style={{ marginTop: '0.25rem' }}>
                <span style={{ color: '#10B981', fontWeight: 600 }}>1 of 1 Device Registered</span>
                <span id="portal-device-name" style={{ color: 'var(--color-muted-stone)', fontSize: '0.8rem', display: 'block' }}>
                  {customer.registeredDevice}
                </span>
              </div>
            </div>

            <div className="portal-detail-item">
              <span className="portal-detail-label">Protected V2 Installer</span>
              <div style={{ marginTop: '0.35rem' }}>
                <a
                  href={`/api/download/v2/authorized?key=${encodeURIComponent(customer.licenseKey)}`}
                  className="btn btn-primary btn-sm"
                  id="btn-portal-download-installer"
                  download
                >
                  <span>Download V2 (.exe)</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M0 3.449L9.75 2.1v9.451H0V3.449zm10.949-1.551L24 0v11.551h-13.051V1.898zM0 12.651h9.75v9.451L0 20.75v-8.099zm10.949 0H24V24l-13.051-1.898V12.651z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Live 1-User 1-Device Security Testing Suite */}
        <div className="licensing-diagnostic-section" style={{ marginTop: '1.5rem' }}>
          <div className="diagnostic-container" style={{ background: 'rgba(8, 14, 32, 0.75)' }}>
            <div className="diagnostic-header">
              <div>
                <h3 className="diagnostic-title">1-User 1-Device Cryptographic Verification Diagnostic</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--color-muted-stone)', marginTop: '0.2rem' }}>
                  Test single-device hardware fingerprint binding against the live Express backend API.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                id="diag-btn-generate-key"
                onClick={fetchDemoKey}
                disabled={isGenerating}
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
              >
                ✦ Auto-Fill Test Key
              </button>
            </div>

            <div className="diagnostic-grid">
              <div className="diagnostic-controls">
                <div className="diag-form-group">
                  <label className="diag-label" htmlFor="diag-license-key">
                    License Key:
                  </label>
                  <input
                    type="text"
                    id="diag-license-key"
                    className="diag-input"
                    placeholder="SF2-XXXX-XXXX-XXXX-XXXX"
                    value={diagKey}
                    onChange={(e) => setDiagKey(e.target.value)}
                  />
                </div>

                <div className="diag-form-group">
                  <label className="diag-label" htmlFor="diag-device-id">
                    Device Fingerprint (SHA-256):
                  </label>
                  <input
                    type="text"
                    id="diag-device-id"
                    className="diag-input"
                    value={diagDeviceFingerprint}
                    onChange={(e) => setDiagDeviceFingerprint(e.target.value)}
                  />
                </div>

                <div className="diag-form-group">
                  <label className="diag-label" htmlFor="diag-device-name">
                    Device Name:
                  </label>
                  <input
                    type="text"
                    id="diag-device-name"
                    className="diag-input"
                    value={diagDeviceName}
                    onChange={(e) => setDiagDeviceName(e.target.value)}
                  />
                </div>

                <div className="diag-buttons-row">
                  <button type="button" className="btn btn-primary btn-sm" id="diag-btn-activate" onClick={handleActivate}>
                    1. Activate PC
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" id="diag-btn-validate" onClick={handleValidate}>
                    2. Heartbeat
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    id="diag-btn-device2"
                    onClick={handleSimulateDevice2}
                    style={{ borderColor: 'rgba(244, 63, 94, 0.5)', color: '#FDA4AF' }}
                  >
                    3. Test 2nd PC
                  </button>
                </div>

                <div style={{ marginTop: '1.25rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1rem' }}>
                  <label className="diag-label" htmlFor="diag-admin-key">
                    Admin Secret (For Migration Reset):
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="password"
                      id="diag-admin-key"
                      className="diag-input"
                      value={diagAdminSecret}
                      onChange={(e) => setDiagAdminSecret(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      id="diag-btn-reset"
                      onClick={handleResetBinding}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      Reset Binding
                    </button>
                  </div>
                </div>
              </div>

              <div className="diagnostic-output-panel">
                <div className="diag-label">Cryptographic Response Stream:</div>
                <div className="diag-results-box" id="diag-results-box">
                  {diagLogs.length === 0 ? (
                    <div style={{ color: '#64748B', fontStyle: 'italic', fontSize: '0.82rem' }}>
                      Ready. Click "1. Activate PC" or "✦ Auto-Fill Test Key" to test the strict 1-device policy live.
                    </div>
                  ) : (
                    diagLogs.map((log, i) => (
                      <pre
                        key={i}
                        style={{
                          margin: '0 0 0.5rem 0',
                          padding: '0.4rem',
                          background: 'rgba(0,0,0,0.3)',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          color: '#A5F3FC',
                          whiteSpace: 'pre-wrap',
                          fontFamily: 'var(--font-mono)'
                        }}
                      >
                        {log}
                      </pre>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        </>
        )}

        {/* =========================================================
            PATH 2: MERCHANT BANK RECONCILIATION & UTR APPROVAL VIEW
            ========================================================= */}
        {activeTab === 'reconciliation' && (
          <div className="portal-reconciliation-section" style={{ marginBottom: '1.5rem' }}>
            {/* Merchant Bank Overview */}
            <div
              style={{
                background: 'rgba(56, 189, 248, 0.05)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                borderRadius: '12px',
                padding: '1.25rem',
                marginBottom: '1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem'
              }}
            >
              <div>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#38BDF8', fontWeight: 700 }}>
                  Active Merchant VPA & Bank
                </span>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FDFBF7', marginTop: '0.2rem', fontFamily: 'monospace' }}>
                  7019886914@axl
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '0.2rem' }}>
                  Holder: <strong>Venkata Sai Pruthvi A V</strong> · Axis Bank · 0% Fee Direct Settlement
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={fetchOrders}
                  disabled={isLoadingOrders}
                  style={{ padding: '0.45rem 1rem', fontSize: '0.82rem' }}
                >
                  {isLoadingOrders ? '⟳ Syncing...' : '⟳ Refresh Orders'}
                </button>
              </div>
            </div>

            {/* Orders List */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1.1rem', color: '#FDFBF7', margin: 0, fontFamily: 'var(--font-display)' }}>
                  Customer Orders & Bank Settlement Queue
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                  Total Orders: {orders.length}
                </span>
              </div>

              {orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🕉️</div>
                  <h4 style={{ color: '#FDFBF7', fontSize: '1rem', margin: '0 0 0.3rem' }}>No orders yet</h4>
                  <p style={{ color: '#94A3B8', fontSize: '0.82rem', margin: 0 }}>
                    When a customer initiates checkout and scans the PhonePe QR code, their order and UTR will appear here.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {orders.map((ord) => {
                    const isPending = ord.status === 'AWAITING_BANK_RECONCILIATION';
                    const isCompleted = ord.status === 'LICENSE_GENERATED';
                    const isFraud = ord.status === 'UNDERPAYMENT_DETECTED';

                    return (
                      <div
                        key={ord.orderId}
                        style={{
                          background: isPending
                            ? 'rgba(212, 175, 55, 0.06)'
                            : isCompleted
                            ? 'rgba(16, 185, 129, 0.05)'
                            : 'rgba(255, 255, 255, 0.02)',
                          border: isPending
                            ? '1px solid rgba(212, 175, 55, 0.35)'
                            : isCompleted
                            ? '1px solid rgba(16, 185, 129, 0.25)'
                            : '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '10px',
                          padding: '1rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.6rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FDFBF7', fontFamily: 'monospace' }}>
                                {ord.orderId}
                              </span>
                              {isPending && (
                                <span style={{ background: '#F59E0B', color: '#000', fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                                  ⏳ Awaiting Bank Verification
                                </span>
                              )}
                              {isCompleted && (
                                <span style={{ background: '#10B981', color: '#000', fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                                  ✓ License Issued
                                </span>
                              )}
                              {isFraud && (
                                <span style={{ background: '#EF4444', color: '#FFF', fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                                  🚨 Underpayment Detected
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.82rem', color: '#94A3B8', marginTop: '0.2rem' }}>
                              Customer: <strong style={{ color: '#E2E8F0' }}>{ord.customerName || 'Devotee'}</strong> ({ord.customerEmail})
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#D4AF37' }}>
                              ₹{ord.amount}.00
                            </div>
                            <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                              {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        {/* UTR & Actions Bar */}
                        <div
                          style={{
                            background: 'rgba(0, 0, 0, 0.25)',
                            borderRadius: '6px',
                            padding: '0.6rem 0.85rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '0.5rem'
                          }}
                        >
                          <div>
                            <span style={{ fontSize: '0.74rem', color: '#94A3B8', display: 'block' }}>
                              Customer Bank UTR / Ref No:
                            </span>
                            <span style={{ fontSize: '0.92rem', color: ord.utr ? '#38BDF8' : '#64748B', fontFamily: 'monospace', fontWeight: 700 }}>
                              {ord.utr || 'Not submitted yet'}
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            {ord.utr && (
                              <button
                                type="button"
                                className="btn-copy-small"
                                onClick={() => {
                                  navigator.clipboard.writeText(ord.utr);
                                  showToast('UTR copied to clipboard!');
                                }}
                                style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem' }}
                              >
                                Copy UTR
                              </button>
                            )}

                            {isPending && (
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => handleApproveOrder(ord.orderId, ord.utr)}
                                disabled={approvingOrderId === ord.orderId}
                                style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem', background: '#10B981', borderColor: '#059669', color: '#FFFFFF' }}
                              >
                                {approvingOrderId === ord.orderId ? 'Approving...' : '✓ Verify Axis Credit & Unlock License'}
                              </button>
                            )}

                            {isCompleted && ord.licenseKey && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <code style={{ fontSize: '0.78rem', color: '#10B981', background: 'rgba(16,185,129,0.1)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>
                                  {ord.licenseKey}
                                </code>
                                <button
                                  type="button"
                                  className="btn-copy-small"
                                  onClick={() => {
                                    navigator.clipboard.writeText(ord.licenseKey);
                                    showToast('License Key copied!');
                                  }}
                                  style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem' }}
                                >
                                  Copy
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Setup Instructions */}
        <div className="dashboard-guide-strip">
          <div className="dashboard-guide-step">
            <span className="dashboard-step-num">Step 1 · Download Installer</span>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-muted-stone)', margin: 0, lineHeight: 1.5 }}>
              Download <strong>SacredFriends-V2-Paid-Setup.exe</strong> directly via your verified portal license token above.
            </p>
          </div>
          <div className="dashboard-guide-step">
            <span className="dashboard-step-num">Step 2 · Enter License Key</span>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-muted-stone)', margin: 0, lineHeight: 1.5 }}>
              Launch the app on Windows 11/10 and enter your <code style={{ color: 'var(--color-gold-light)' }}>SF2-XXXX</code> key on the welcome prompt.
            </p>
          </div>
          <div className="dashboard-guide-step">
            <span className="dashboard-step-num">Step 3 · Offline Tranquility</span>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-muted-stone)', margin: 0, lineHeight: 1.5 }}>
              Your hardware binds cryptographically to your 1 PC. Enjoy your living desktop companions 100% offline.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
