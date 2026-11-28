import React, { useState } from 'react';
import './about.css';

export const About = () => {
  // Default to 'work' expanded, allow toggling
  const [activeSection, setActiveSection] = useState('work');

  const toggleSection = (sectionKey) => {
    setActiveSection((prev) => (prev === sectionKey ? null : sectionKey));
  };

  return (
    <section className="realm-about" id="about" aria-label="About Q-CUBIC Innovations">
      <div className="about-container">
        {/* 2-Column Split: Left = Narrative & Accordions, Right = Visual Brand Showcase */}
        <div className="about-split-layout">
          {/* Left Column: Narrative & Interactive Accordions */}
          <div className="about-left-col">
            <h2 className="about-title-text">
              About Us
            </h2>

            <p className="about-lead-manifesto">
              We are an independent software atelier based in Bengaluru, India. We believe technology
              should not extract human attention, exploit personal data, or create sensory noise—it
              should uplift human potential with quiet craft, enduring elegance, and absolute integrity.
            </p>

            {/* Accordion Panels (Our Work, Our Impact, Our Trust) */}
            <div className="about-accordion-list" role="tablist">
              {/* 1. Our Work */}
              <div
                className={`accordion-card ${activeSection === 'work' ? 'expanded' : ''}`}
              >
                <button
                  type="button"
                  className="accordion-trigger"
                  onClick={() => toggleSection('work')}
                  aria-expanded={activeSection === 'work'}
                  aria-controls="panel-work"
                >
                  <div className="trigger-left">
                    <span className="trigger-index">01</span>
                    <span className="trigger-title">Our Work</span>
                  </div>
                  <div className="trigger-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </button>

                <div
                  id="panel-work"
                  className="accordion-content"
                  role="region"
                  style={{ display: activeSection === 'work' ? 'block' : 'none' }}
                >
                  <div className="content-inner">
                    <h4 className="content-heading">Obsessive Software Craftsmanship</h4>
                    <p className="content-desc">
                      We design and build native, high-performance software with uncompromising architectural
                      discipline. Every pixel, micro-interaction, and system thread is engineered for lightning
                      speed, low memory usage, and timeless aesthetic polish.
                    </p>
                    <div className="content-tags">
                      <span className="content-tag">Native Windows Architecture</span>
                      <span className="content-tag">&lt; 0.4% CPU Footprint</span>
                      <span className="content-tag">60 FPS Fluidity</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Our Impact */}
              <div
                className={`accordion-card ${activeSection === 'impact' ? 'expanded' : ''}`}
              >
                <button
                  type="button"
                  className="accordion-trigger"
                  onClick={() => toggleSection('impact')}
                  aria-expanded={activeSection === 'impact'}
                  aria-controls="panel-impact"
                >
                  <div className="trigger-left">
                    <span className="trigger-index">02</span>
                    <span className="trigger-title">Our Impact</span>
                  </div>
                  <div className="trigger-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </button>

                <div
                  id="panel-impact"
                  className="accordion-content"
                  role="region"
                  style={{ display: activeSection === 'impact' ? 'block' : 'none' }}
                >
                  <div className="content-inner">
                    <h4 className="content-heading">Human Attention &amp; Daily Serenity</h4>
                    <p className="content-desc">
                      True impact is measured not by hours captured or engagement algorithms, but by how
                      much stillness, focus, and quiet utility our tools return to your day. We build software
                      that respects your cognitive energy and quietly serves your highest work.
                    </p>
                    <div className="content-tags">
                      <span className="content-tag">Zero Algorithmic Noise</span>
                      <span className="content-tag">Deep Work Mindfulness</span>
                      <span className="content-tag">Human-Centric Design</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Our Trust */}
              <div
                className={`accordion-card ${activeSection === 'trust' ? 'expanded' : ''}`}
              >
                <button
                  type="button"
                  className="accordion-trigger"
                  onClick={() => toggleSection('trust')}
                  aria-expanded={activeSection === 'trust'}
                  aria-controls="panel-trust"
                >
                  <div className="trigger-left">
                    <span className="trigger-index">03</span>
                    <span className="trigger-title">Our Trust</span>
                  </div>
                  <div className="trigger-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </button>

                <div
                  id="panel-trust"
                  className="accordion-content"
                  role="region"
                  style={{ display: activeSection === 'trust' ? 'block' : 'none' }}
                >
                  <div className="content-inner">
                    <h4 className="content-heading">Sovereign Privacy &amp; Integrity</h4>
                    <p className="content-desc">
                      We reject surveillance capitalism. Our software runs 100% locally on your machine with
                      zero telemetry, zero behavioral tracking, and zero data harvesting. Our relationship with
                      users is built on honesty, fair one-time licensing, and lifelong data sovereignty.
                    </p>
                    <div className="content-tags">
                      <span className="content-tag">100% Offline &amp; Local</span>
                      <span className="content-tag">Zero Data Harvesting</span>
                      <span className="content-tag">Fair Sovereign Pricing</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Plain Q-CUBIC Logo (No box, no border, no extra text) */}
          <div className="about-right-col">
            <div className="plain-qc-logo-wrap">
              <img
                src="/assets/q_cubic_logo.png"
                alt="Q-CUBIC Logo"
                className="plain-qc-logo-img"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
