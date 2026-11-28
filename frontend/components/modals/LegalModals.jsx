import React from 'react';

export const LegalModals = ({ termsOpen, privacyOpen, onCloseTerms, onClosePrivacy }) => {
  return (
    <>
      {/* Terms & Conditions Modal */}
      {termsOpen && (
        <div
          id="terms-modal"
          className="modal-overlay open"
          role="dialog"
          aria-modal="true"
          aria-labelledby="terms-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) onCloseTerms();
          }}
        >
          <div className="modal-dialog">
            <button
              type="button"
              id="terms-modal-close"
              className="modal-close-btn"
              aria-label="Close dialog"
              onClick={onCloseTerms}
            >
              &times;
            </button>
            <h2 id="terms-modal-title" className="font-display" style={{ fontSize: '1.5rem', color: 'var(--color-gold-light)', marginBottom: '1.25rem' }}>
              Terms and Conditions
            </h2>
            <div style={{ fontSize: '0.9rem', color: 'var(--color-soft-cream)', lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p><strong>1. Product Identity:</strong> Sacred Friends is a Windows desktop companion application developed and published by Q-CUBIC (Ideas. People. Real Impact. Slogan: Small Ideas Build Big Things). The characters are desktop companions, not wallpapers.</p>
              <p><strong>2. Free Edition (V1):</strong> Sacred Friends V1 is provided free of charge for personal desktop use on supported Windows operating systems.</p>
              <p><strong>3. Strict Premium License Policy (V2):</strong> ONE PAYMENT = ONE PURCHASER = ONE USER = ONE WINDOWS DEVICE. Every successful purchase creates one personal license for the purchaser. The license cannot be shared, rented, leased, or redistributed across multiple users or devices.</p>
              <p><strong>4. Device Activation &amp; Reinstallation:</strong> One registered Windows device is permitted per license. The original purchaser may reinstall the application on their registered device. Device migration requires authorized administrator reset.</p>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      {privacyOpen && (
        <div
          id="privacy-modal"
          className="modal-overlay open"
          role="dialog"
          aria-modal="true"
          aria-labelledby="privacy-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClosePrivacy();
          }}
        >
          <div className="modal-dialog">
            <button
              type="button"
              id="privacy-modal-close"
              className="modal-close-btn"
              aria-label="Close dialog"
              onClick={onClosePrivacy}
            >
              &times;
            </button>
            <h2 id="privacy-modal-title" className="font-display" style={{ fontSize: '1.5rem', color: 'var(--color-gold-light)', marginBottom: '1.25rem' }}>
              Privacy Policy
            </h2>
            <div style={{ fontSize: '0.9rem', color: 'var(--color-soft-cream)', lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p><strong>1. Offline Execution:</strong> Sacred Friends operates 100% offline on your local Windows PC. It does not track, record, or transmit keystrokes, opened applications, or screen content.</p>
              <p><strong>2. Licensing Information:</strong> For Sacred Friends V2 Premium, customer contact information (name, email) and a cryptographic device hardware fingerprint are processed solely for personal license issuance and single-device activation verification.</p>
              <p><strong>3. Payment Security:</strong> Payment transactions are handled securely through the sovereign YouPI-PG UPI gateway in encrypted channels. Q-CUBIC does not store banking PINs or UPI credentials.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
