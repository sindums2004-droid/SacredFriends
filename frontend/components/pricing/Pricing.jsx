import React, { useEffect, useState } from 'react';
import { initReflectiveCards } from './reflectiveCard.js';
import { useToast } from '../../context/ToastContext.jsx';
import './pricing.css';
import './reflectiveCard.css';

export const Pricing = ({ onGetV2, onOpenDashboard }) => {
  const { showToast } = useToast();
  const [v1Downloading, setV1Downloading] = useState(false);

  useEffect(() => {
    const cleanup = initReflectiveCards();
    return () => {
      cleanup?.();
    };
  }, []);

  const handleDownloadV1 = (e) => {
    setV1Downloading(true);
    showToast('Starting Sacred Friends V1 Free download...');
    setTimeout(() => {
      setV1Downloading(false);
    }, 2500);
  };

  return (
    <section className="cinematic-realm realm-premium" id="premium" aria-label="Pricing">
      <div className="realm-vignette-top" />
      <div className="realm-vignette-bottom" />

      <div className="realm-content">
        <div className="pricing-heading">
          <span className="pricing-eyebrow">Simple, honest pricing</span>
          <h2 className="font-display">
            Choose your <span className="gold-shimmer">Sacred Friends</span> edition
          </h2>
          <p>Start free, or unlock the complete experience with a one-time lifetime license.</p>
        </div>

        <div className="pricing-grid">
          {/* Sacred Friends V1 Free - Reflective Card */}
          <article className="pricing-card pricing-card-free reflective-card reflective-card--dark" aria-labelledby="pricing-free-title">
            <canvas className="reflective-card__canvas" aria-hidden="true" />
            <div className="reflective-card__content">
              <div className="reflective-card__header">
                <span className="pricing-tier-name" id="pricing-free-title">Free Edition</span>
                <span className="reflective-card__status">
                  <span className="reflective-card__dot" style={{ background: '#38bdf8' }} />
                  Starter
                </span>
              </div>

              <header className="pricing-card-header">
                <div className="pricing-amount">₹0</div>
                <p className="pricing-period">Free forever · No card required</p>
              </header>

              <div className="pricing-includes">INCLUDES</div>
              <ul className="pricing-features">
                <li>All 15 sacred desktop companions</li>
                <li>Standard day &amp; night resting poses</li>
                <li>Offline local Windows 11 runner</li>
              </ul>

              <a
                href="/api/download/v1"
                className="pricing-cta pricing-cta-secondary action-download-v1"
                download
                onClick={handleDownloadV1}
                aria-label="Download Sacred Friends Free Edition"
              >
                <span>{v1Downloading ? 'Downloading...' : 'Download Free Edition'}</span>
                <span aria-hidden="true">↓</span>
              </a>
              <div className="action-status-box v1-status-box" id="v1-status-box" />

            </div>
            <span className="reflective-card__rim" />
          </article>

          {/* Sacred Friends V2 Premium - Reflective Card */}
          <article className="pricing-card pricing-card-premium reflective-card reflective-card--dark reflective-card--premium" aria-labelledby="pricing-premium-title">
            <canvas className="reflective-card__canvas" aria-hidden="true" />
            <div className="reflective-card__content">
              <div className="reflective-card__header">
                <span className="pricing-tier-name" id="pricing-premium-title">
                  Lifetime Premium
                </span>
                <span className="reflective-card__status">
                  <span className="reflective-card__dot" style={{ background: '#22c55e' }} />
                  Complete
                </span>
              </div>

              <header className="pricing-card-header">
                <div className="pricing-price-line" id="v2-price-container">
                  <span className="pricing-amount" id="v2-display-price">₹499</span>
                </div>
                <p className="pricing-period">One-time payment · Lifetime access</p>
              </header>

              <div className="pricing-includes">EVERYTHING IN FREE, PLUS</div>
              <ul className="pricing-features">
                <li>Extended ceremonial animations</li>
                <li>Sacred ambient soundscapes &amp; bells</li>
                <li>Customizable workday focus timers</li>
                <li>Single-device lifetime license</li>
              </ul>

              <button
                type="button"
                className="pricing-cta pricing-cta-primary action-get-v2"
                id="btn-get-v2"
                onClick={onGetV2}
                aria-label="Claim Sacred Friends Premium lifetime license"
              >
                <span>Get Lifetime Premium</span>
                <span aria-hidden="true">→</span>
              </button>
              <p className="pricing-license-note">Single-device license · Instant key delivery</p>
              <div className="action-status-box" id="v2-status-box" />

            </div>
            <span className="reflective-card__rim" />
          </article>
        </div>

        <div className="pricing-dashboard">
          <span>Already have Premium? Manage your license or installer.</span>
          <button type="button" className="action-open-dashboard" onClick={onOpenDashboard}>
            Open Customer Dashboard <span aria-hidden="true">↗</span>
          </button>
        </div>
      </div>
    </section>
  );
};
