import React from 'react';
import { ContactForm } from './ContactForm.jsx';
import './contact.css';

export const Contact = () => {
  const handleContactSubmit = async (values) => {
    // 1. Submit to Node.js backend JSON persistence
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: values.name,
        email: values.email,
        subject: values.subject,
        topic: values.subject,
        message: values.message
      })
    });

    if (!res.ok) {
      throw new Error('API submission failed');
    }

    if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
      window.showToast('Inquiry recorded with reverence. We will reply soon.');
    }
  };

  return (
    <section className="cinematic-realm realm-contact" id="contact" aria-label="Contact Sacred Friends">
      <div className="contact-ambient-glow" aria-hidden="true" />
      <div className="realm-vignette-top" />

      <div className="realm-content">
        <div className="contact-split-container">
          {/* Left Column: Heading, Context & Concierge Details */}
          <div className="contact-info-side">
            <div className="realm-tagline-badge contact-badge-left">
              <span>✦ Direct Concierge &amp; Support</span>
            </div>
            <h2 className="realm-title contact-title-left">
              Direct &amp; Serene <span className="gold-shimmer">Inquiries</span>
            </h2>
            <p className="contact-aesthetic-subtitle contact-subtitle-left">
              Have questions regarding Windows 11 desktop companions, single-device license activation, or custom studio requests? We welcome your message.
            </p>

            <div className="contact-details-list">
              <div className="contact-detail-card">
                <div className="contact-detail-icon">✉</div>
                <div className="contact-detail-text">
                  <div className="contact-detail-label">Direct Concierge Email</div>
                  <div className="contact-detail-val">concierge@sacredfriends.com</div>
                </div>
              </div>

              <div className="contact-detail-card">
                <div className="contact-detail-icon">⏱</div>
                <div className="contact-detail-text">
                  <div className="contact-detail-label">Response Time</div>
                  <div className="contact-detail-val">Usually within one business day</div>
                </div>
              </div>

              <div className="contact-detail-card">
                <div className="contact-detail-icon">🛡</div>
                <div className="contact-detail-text">
                  <div className="contact-detail-label">Platform Support</div>
                  <div className="contact-detail-val">Windows 11 Native • Dedicated Activation Help</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Minimalist Form */}
          <div className="contact-form-side">
            <ContactForm
              title="Get in touch"
              subtitle="We usually reply within one business day."
              submitLabel="Send message"
              onSubmit={handleContactSubmit}
            />
          </div>
        </div>
      </div>
    </section>
  );
};
