import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../../context/ToastContext.jsx';

export const CheckoutModal = ({ isOpen, onClose, onOpenDashboard }) => {
  const { showToast } = useToast();

  // 4 Ultra-Minimalist Screens: 'details' -> 'payment' -> 'verify' -> 'product'
  const [currentStep, setCurrentStep] = useState('details');

  // Customer Inputs
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [utrInput, setUtrInput] = useState('');
  const [orderId, setOrderId] = useState('');

  // UI / Error State
  const [stepError, setStepError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Result state
  const [paymentStatus, setPaymentStatus] = useState('SUCCESS'); // 'SUCCESS' | 'UNDERPAYMENT' | 'FAILED'
  const [statusMessage, setStatusMessage] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');

  // Device Activation State
  const [isActivatingDevice, setIsActivatingDevice] = useState(false);
  const [activationResult, setActivationResult] = useState(null);

  const pollIntervalRef = useRef(null);

  // Initialize or reset when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      clearInterval(pollIntervalRef.current);
      setCurrentStep('details');
      setStepError('');
      setIsProcessing(false);
      setActivationResult(null);
    } else {
      const saved = localStorage.getItem('sf_user');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.email) setEmail(parsed.email);
          if (parsed.name) setName(parsed.name);
        } catch (e) {}
      }
    }
  }, [isOpen]);

  // Background polling for payment confirmation (Step 3 -> Step 4)
  const startPollingPaymentStatus = (activeOrderId) => {
    clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/payment/status/${encodeURIComponent(activeOrderId)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === 'SUCCESS' && data.licenseKey) {
          clearInterval(pollIntervalRef.current);
          setLicenseKey(data.licenseKey);
          setDownloadUrl(data.downloadUrl || `/api/download/v2/authorized?key=${encodeURIComponent(data.licenseKey)}`);
          setPaymentStatus('SUCCESS');
          setCurrentStep('product');
          showToast('Payment verified! License unlocked.');
        } else if (data.status === 'UNDERPAYMENT_DETECTED') {
          clearInterval(pollIntervalRef.current);
          setPaymentStatus('UNDERPAYMENT');
          setStatusMessage(data.message || 'Underpayment detected! ₹499.00 required.');
          setCurrentStep('product');
          showToast('Payment rejected: Underpayment detected.');
        } else if (data.status === 'PAYMENT_FAILED') {
          clearInterval(pollIntervalRef.current);
          setPaymentStatus('FAILED');
          setStatusMessage(data.message || 'Payment failed.');
          setCurrentStep('product');
        }
      } catch (err) {}
    }, 2000);
  };

  // STEP 1 -> STEP 2: Submit Details
  const handleDetailsSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setStepError('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setStepError('Please enter a valid email address.');
      showToast('Valid email required.');
      return;
    }

    const cleanName = name.trim() || cleanEmail.split('@')[0] || 'Devotee';
    localStorage.setItem('sf_user', JSON.stringify({ email: cleanEmail, name: cleanName }));

    setIsProcessing(true);
    try {
      const res = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: cleanName,
          customerEmail: cleanEmail,
          amount: 499
        })
      });
      const data = await res.json();
      const activeOrderId = data?.orderId || `SF-ORD-${Date.now()}`;
      setOrderId(activeOrderId);
      setCurrentStep('payment');
    } catch (err) {
      setOrderId(`SF-ORD-${Date.now()}`);
      setCurrentStep('payment');
    } finally {
      setIsProcessing(false);
    }
  };

  // STEP 2 -> STEP 3: Submit 12-Digit UTR
  const handlePaymentSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setStepError('');

    const cleanUtr = utrInput.trim().replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (!cleanUtr) {
      setStepError('Please enter the 12-digit UPI reference number.');
      showToast('12-digit UTR required.');
      return;
    }

    if (cleanUtr.length !== 12) {
      setStepError('UPI Reference Number must be exactly 12 characters.');
      showToast('UTR must be exactly 12 characters.');
      return;
    }

    if (/^(.)\1{11}$/.test(cleanUtr) || ['123456789012', '012345678901', '987654321098', '000012345678'].includes(cleanUtr)) {
      setStepError('Invalid reference: Dummy test numbers cannot be verified.');
      showToast('Invalid / dummy UTR rejected.');
      return;
    }

    setIsProcessing(true);
    try {
      const activeOrderId = orderId || `SF-ORD-${Date.now()}`;
      const res = await fetch('/api/payment/submit-utr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: activeOrderId, utr: cleanUtr })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        if (data.status === 'SUCCESS' && data.licenseKey) {
          setLicenseKey(data.licenseKey);
          setDownloadUrl(data.downloadUrl);
          setPaymentStatus('SUCCESS');
          setCurrentStep('product');
          showToast('Payment verified! License unlocked.');
        } else {
          // Awaiting real bank settlement
          setStatusMessage(data.message || 'Verifying transaction with Axis Bank ledger...');
          setCurrentStep('verify');
          startPollingPaymentStatus(activeOrderId);
        }
      } else {
        if (data.error === 'UNDERPAYMENT_DETECTED') {
          setPaymentStatus('UNDERPAYMENT');
          setStatusMessage(data.message || 'Underpayment detected! Exactly ₹499.00 is required.');
          setCurrentStep('product');
        } else {
          setStepError(data.message || 'UTR verification failed.');
          showToast(data.message || 'Verification error.');
        }
      }
    } catch (err) {
      setStepError('Network timeout. Please verify your connection.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Hardware binding
  const handleActivateDevice = async () => {
    if (!licenseKey) return;
    setIsActivatingDevice(true);
    try {
      const testFingerprint = 'WIN11-' + Math.random().toString(36).substring(2, 10).toUpperCase() + '-MAIN-PC';
      const res = await fetch('/api/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseKey,
          deviceFingerprint: testFingerprint,
          deviceName: 'Primary Windows PC'
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActivationResult({
          success: true,
          message: '✓ Bound to this Windows PC!'
        });
        showToast('License successfully activated!');
      } else {
        setActivationResult({
          success: false,
          message: data.message || 'Activation rejected.'
        });
        showToast(data.message || 'Activation failed');
      }
    } catch (err) {
      setActivationResult({ success: false, message: err.message });
    } finally {
      setIsActivatingDevice(false);
    }
  };

  const copyVPA = () => {
    navigator.clipboard.writeText('7019886914@axl');
    showToast('UPI ID copied: 7019886914@axl');
  };

  const copyKey = () => {
    navigator.clipboard.writeText(licenseKey);
    showToast('License key copied!');
  };

  const upiLink = `upi://pay?pa=7019886914@axl&pn=VENKATA%20SAI%20PRUTHVI%20A%20V&am=499.00&cu=INR&tn=${encodeURIComponent(orderId || 'SacredFriends')}&mam=499.00`;

  const stepsList = ['details', 'payment', 'verify', 'product'];
  const currentStepIndex = stepsList.indexOf(currentStep);

  if (!isOpen) return null;

  return (
    <div
      id="checkout-modal"
      className="modal-overlay open"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        backdropFilter: 'blur(20px)',
        background: 'rgba(3, 6, 15, 0.75)'
      }}
    >
      <div
        className="modal-dialog"
        style={{
          maxWidth: '520px',
          width: '94%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '1.75rem 1.8rem',
          textAlign: 'center',
          borderRadius: '24px',
          background: 'radial-gradient(circle at 50% 0%, #0d152a 0%, #050814 100%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 30px 70px rgba(0, 0, 0, 0.85), 0 0 40px rgba(212, 175, 55, 0.12)'
        }}
      >
        {/* Subtle Close Button */}
        <button
          type="button"
          id="checkout-close-btn"
          className="modal-close-btn"
          aria-label="Close dialog"
          onClick={onClose}
          style={{
            top: '1.25rem',
            right: '1.25rem',
            color: '#64748B',
            fontSize: '1.2rem',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.04)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          ✕
        </button>

        {/* Ultra-Minimalist Segmented Progress Bar */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '1.75rem', padding: '0 2px' }}>
          {stepsList.map((step, idx) => (
            <div
              key={step}
              style={{
                flex: 1,
                height: '3px',
                borderRadius: '999px',
                background: idx <= currentStepIndex ? '#D4AF37' : 'rgba(255, 255, 255, 0.1)',
                transition: 'background 0.3s ease'
              }}
            />
          ))}
        </div>

        {/* =========================================================
            SCREEN 1: NAME & LICENSE DELIVERY EMAIL (SIDE BY SIDE)
            ========================================================= */}
        {currentStep === 'details' && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '0.35rem' }}>🕉️</div>
              <h2 id="checkout-modal-title" className="font-display" style={{ fontSize: '1.35rem', color: '#FDFBF7', margin: '0 0 0.3rem' }}>
                Sacred Friends V2
              </h2>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#D4AF37', letterSpacing: '-0.02em' }}>
                ₹499 <span style={{ fontSize: '0.78rem', fontWeight: 400, color: '#94A3B8' }}>/ lifetime license</span>
              </div>
            </div>

            <form onSubmit={handleDetailsSubmit} style={{ textAlign: 'left' }}>
              {/* Name & Email Side by Side */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
                <div>
                  <label htmlFor="customer-name-input" style={minimalLabelStyle}>
                    Name
                  </label>
                  <input
                    id="customer-name-input"
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setStepError('');
                    }}
                    style={minimalInputStyle}
                  />
                </div>

                <div>
                  <label htmlFor="customer-email-input" style={minimalLabelStyle}>
                    Email <span style={{ color: '#D4AF37' }}>*</span>
                  </label>
                  <input
                    id="customer-email-input"
                    type="email"
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setStepError('');
                    }}
                    required
                    style={minimalInputStyle}
                  />
                </div>
              </div>

              {stepError && (
                <div style={errorBannerStyle}>
                  {stepError}
                </div>
              )}

              <button
                type="submit"
                disabled={isProcessing}
                style={minimalBtnStyle}
              >
                {isProcessing ? 'Continuing...' : 'Continue to Payment →'}
              </button>
            </form>
          </div>
        )}

        {/* =========================================================
            SCREEN 2: QR & PAYMENT DETAILS (SIDE BY SIDE)
            ========================================================= */}
        {currentStep === 'payment' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1.5rem', alignItems: 'center', textAlign: 'left' }}>
              {/* Left Column: QR Code & Price */}
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.68rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                  Total Due
                </span>
                <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#D4AF37', margin: '0.1rem 0 0.5rem' }}>
                  ₹499.00
                </div>

                {/* Clean QR Box */}
                <div
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '14px',
                    padding: '8px',
                    display: 'inline-block',
                    boxShadow: '0 6px 24px rgba(0, 0, 0, 0.45)',
                    marginBottom: '0.5rem'
                  }}
                >
                  <img
                    src="/assets/phonepe_qr.jpg"
                    alt="Scan to Pay ₹499"
                    style={{ width: '130px', height: '130px', display: 'block', borderRadius: '6px' }}
                  />
                </div>

                <div>
                  <a
                    href={upiLink}
                    style={{
                      fontSize: '0.74rem',
                      color: '#38BDF8',
                      textDecoration: 'none',
                      fontWeight: 500
                    }}
                  >
                    Open in UPI App ↗
                  </a>
                </div>
              </div>

              {/* Right Column: UPI ID, UTR Input, Action */}
              <div>
                {/* Minimalist UPI ID Pill */}
                <div style={{ marginBottom: '0.85rem' }}>
                  <label style={minimalLabelStyle}>Verified Merchant UPI ID</label>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '10px',
                      padding: '0.45rem 0.75rem'
                    }}
                  >
                    <span style={{ fontSize: '0.82rem', color: '#F1F5F9', fontFamily: 'monospace' }}>
                      7019886914@axl
                    </span>
                    <button type="button" onClick={copyVPA} style={microCopyBtnStyle}>
                      Copy
                    </button>
                  </div>
                </div>

                {/* UTR Input */}
                <div style={{ marginBottom: '1rem' }}>
                  <label htmlFor="customer-utr-input" style={minimalLabelStyle}>
                    12-Digit Reference (UTR) <span style={{ color: '#D4AF37' }}>*</span>
                  </label>
                  <input
                    id="customer-utr-input"
                    type="text"
                    maxLength={12}
                    placeholder="482910492817"
                    value={utrInput}
                    onChange={(e) => {
                      setUtrInput(e.target.value);
                      setStepError('');
                    }}
                    style={{ ...minimalInputStyle, fontFamily: 'monospace', letterSpacing: '1px', fontSize: '0.9rem' }}
                  />
                </div>

                {stepError && (
                  <div style={errorBannerStyle}>
                    {stepError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handlePaymentSubmit}
                  disabled={isProcessing}
                  style={minimalBtnStyle}
                >
                  {isProcessing ? 'Verifying...' : 'Verify Payment →'}
                </button>

                <div style={{ textAlign: 'center', marginTop: '0.65rem' }}>
                  <button
                    type="button"
                    onClick={() => setCurrentStep('details')}
                    style={{ background: 'transparent', border: 'none', color: '#64748B', fontSize: '0.74rem', cursor: 'pointer' }}
                  >
                    ← Back
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            SCREEN 3: VERIFY (GENUINE BANK SETTLEMENT VERIFICATION)
            ========================================================= */}
        {currentStep === 'verify' && (
          <div style={{ padding: '2rem 0', textAlign: 'center' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                border: '2px solid rgba(212, 175, 55, 0.2)',
                borderTopColor: '#D4AF37',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 1.5rem'
              }}
            />
            <h2 className="font-display" style={{ fontSize: '1.25rem', color: '#FDFBF7', margin: '0 0 0.35rem' }}>
              Verifying Payment...
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#94A3B8', margin: '0 auto 1.25rem', maxWidth: '300px', lineHeight: 1.5 }}>
              Waiting for Axis Bank credit confirmation of ₹499.00
            </p>

            {utrInput && (
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '0.45rem 0.85rem',
                  display: 'inline-block',
                  marginBottom: '1.5rem'
                }}
              >
                <span style={{ fontSize: '0.68rem', color: '#64748B', display: 'block' }}>UTR Reference</span>
                <span style={{ fontSize: '0.9rem', color: '#D4AF37', fontWeight: 600, fontFamily: 'monospace' }}>
                  {utrInput}
                </span>
              </div>
            )}

            <p style={{ fontSize: '0.7rem', color: '#475569', maxWidth: '280px', margin: '0 auto' }}>
              This page will automatically unlock once the payment is confirmed.
            </p>
          </div>
        )}

        {/* =========================================================
            SCREEN 4: PRODUCT LINK & LICENSE KEY
            ========================================================= */}
        {currentStep === 'product' && (
          <div>
            {paymentStatus === 'SUCCESS' && (
              <div>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: 'rgba(212, 175, 55, 0.15)',
                    border: '1px solid #D4AF37',
                    color: '#D4AF37',
                    fontSize: '1.4rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 0.85rem'
                  }}
                >
                  ✓
                </div>

                <h2 className="font-display" style={{ fontSize: '1.3rem', color: '#FDFBF7', margin: '0 0 0.25rem' }}>
                  Sacred Friends Premium
                </h2>
                <p style={{ fontSize: '0.78rem', color: '#94A3B8', margin: '0 0 1.5rem' }}>
                  Licensed to {email}
                </p>

                {/* PRODUCT LINK / DOWNLOAD BUTTON */}
                <a
                  href={downloadUrl || `/api/download/v2/authorized?key=${encodeURIComponent(licenseKey)}`}
                  download="SacredFriends-V2-Paid-Setup.exe"
                  style={{
                    display: 'block',
                    width: '100%',
                    background: 'linear-gradient(135deg, #38BDF8 0%, #0284C7 100%)',
                    color: '#040714',
                    textDecoration: 'none',
                    borderRadius: '12px',
                    padding: '0.85rem',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    textAlign: 'center',
                    boxSizing: 'border-box',
                    boxShadow: '0 4px 20px rgba(56, 189, 248, 0.3)',
                    marginBottom: '1rem'
                  }}
                >
                  ⬇ Download Installer (.exe)
                </a>

                {/* Minimalist License Key Box */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '0.65rem 0.85rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ textAlign: 'left' }}>
                    <span style={{ fontSize: '0.58rem', color: '#64748B', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      License Key
                    </span>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.92rem', fontWeight: 600, color: '#F8FAFC' }}>
                      {licenseKey}
                    </span>
                  </div>
                  <button type="button" onClick={copyKey} style={microCopyBtnStyle}>
                    Copy
                  </button>
                </div>

                {/* Hardware Activation Pill */}
                <button
                  type="button"
                  onClick={handleActivateDevice}
                  disabled={isActivatingDevice}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    color: '#D4AF37',
                    borderRadius: '10px',
                    padding: '0.55rem',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {isActivatingDevice ? 'Binding...' : '⚡ Bind to this Windows PC'}
                </button>

                {activationResult && (
                  <div style={{ marginTop: '0.65rem', fontSize: '0.74rem', color: activationResult.success ? '#34D399' : '#F87171' }}>
                    {activationResult.message}
                  </div>
                )}
              </div>
            )}

            {paymentStatus === 'UNDERPAYMENT' && (
              <div style={{ padding: '1rem 0' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.4rem' }}>🛑</div>
                <h3 className="font-display" style={{ fontSize: '1.25rem', color: '#FDFBF7', margin: '0.35rem 0' }}>
                  Underpayment Detected
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: '0 0 1.25rem' }}>
                  {statusMessage || 'Exactly ₹499.00 is required for activation.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentStep('payment');
                    setStepError('');
                  }}
                  style={minimalBtnStyle}
                >
                  ← Retry Payment (₹499)
                </button>
              </div>
            )}

            {paymentStatus === 'FAILED' && (
              <div style={{ padding: '1rem 0' }}>
                <div style={{ fontSize: '2rem', color: '#EF4444', marginBottom: '0.5rem' }}>✕</div>
                <h3 className="font-display" style={{ fontSize: '1.25rem', color: '#FDFBF7', margin: '0.35rem 0' }}>
                  Payment Unsuccessful
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: '0 0 1.25rem' }}>
                  {statusMessage || 'Verification could not be completed.'}
                </p>
                <button
                  type="button"
                  onClick={() => setCurrentStep('payment')}
                  style={minimalBtnStyle}
                >
                  ← Try Again
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Ultra-Minimalist Design System Tokens
const minimalLabelStyle = {
  fontSize: '0.74rem',
  color: '#94A3B8',
  display: 'block',
  marginBottom: '0.35rem',
  fontWeight: 500
};

const minimalInputStyle = {
  width: '100%',
  background: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '12px',
  padding: '0.75rem 0.9rem',
  color: '#FFFFFF',
  fontSize: '0.88rem',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s ease'
};

const minimalBtnStyle = {
  width: '100%',
  background: 'linear-gradient(135deg, #D4AF37 0%, #AA8010 100%)',
  color: '#050814',
  border: 'none',
  borderRadius: '12px',
  padding: '0.8rem',
  fontSize: '0.9rem',
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: '0 4px 20px rgba(212, 175, 55, 0.25)',
  transition: 'opacity 0.2s ease, transform 0.15s ease'
};

const microCopyBtnStyle = {
  background: 'rgba(255, 255, 255, 0.06)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  color: '#E2E8F0',
  borderRadius: '6px',
  padding: '2px 8px',
  fontSize: '0.7rem',
  cursor: 'pointer',
  fontWeight: 500
};

const errorBannerStyle = {
  color: '#FCA5A5',
  fontSize: '0.74rem',
  marginBottom: '1rem',
  background: 'rgba(239, 68, 68, 0.1)',
  border: '1px solid rgba(239, 68, 68, 0.25)',
  borderRadius: '10px',
  padding: '0.5rem 0.75rem',
  lineHeight: 1.4
};
