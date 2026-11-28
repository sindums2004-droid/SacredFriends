import React from 'react';
import './footer.css';

export const Footer = ({ onOpenDashboard, onOpenTerms, onOpenPrivacy }) => {
  return (
    <footer className="realm-vercel-footer" role="contentinfo">
      <div className="vercel-footer-container">
        {/* 6-Column Navigation Grid */}
        <div className="vercel-footer-grid">
          {/* Column 1: Build */}
          <div className="vercel-footer-col">
            <h4 className="vercel-footer-heading">Build</h4>
            <ul className="vercel-footer-links">
              <li><a href="#opening" className="vercel-footer-link">Windows 11 / 10 Companion</a></li>
              <li><a href="#pantheon" className="vercel-footer-link">15 Sacred Archetypes</a></li>
              <li><a href="#journey" className="vercel-footer-link">Flute &amp; Melodies</a></li>
              <li><a href="#experience" className="vercel-footer-link">Offline Sanctum</a></li>
              <li><a href="#opening" className="vercel-footer-link">Ambient Aura Engine</a></li>
              <li>
                <button type="button" className="vercel-footer-link" onClick={onOpenDashboard}>
                  Customer Dashboard
                </button>
              </li>
              <li><a href="#premium" className="vercel-footer-link">Custom Studio Builds</a></li>
            </ul>
          </div>

          {/* Column 2: Learn */}
          <div className="vercel-footer-col">
            <h4 className="vercel-footer-heading">Learn</h4>
            <ul className="vercel-footer-links">
              <li><a href="#about" className="vercel-footer-link">Docs</a></li>
              <li><a href="#journey" className="vercel-footer-link">Quickstart Guide</a></li>
              <li><a href="#experience" className="vercel-footer-link">Hardware Binding Guide</a></li>
              <li><a href="#about" className="vercel-footer-link">Knowledge Base</a></li>
              <li><a href="#pantheon" className="vercel-footer-link">Vedic Sound Frequencies</a></li>
              <li><a href="#premium" className="vercel-footer-link">Device Reset Protocol</a></li>
              <li><a href="#contact" className="vercel-footer-link">Community Support</a></li>
              <li><a href="#about" className="vercel-footer-link">Release Notes</a></li>
            </ul>
          </div>

          {/* Column 3: Explore */}
          <div className="vercel-footer-col">
            <h4 className="vercel-footer-heading">Explore</h4>
            <ul className="vercel-footer-links">
              <li><a href="#pantheon" className="vercel-footer-link">Pantheon Gallery</a></li>
              <li><a href="#journey" className="vercel-footer-link">Melodic Soundscapes</a></li>
              <li><a href="#experience" className="vercel-footer-link">Sacred Spaces</a></li>
              <li><a href="#premium" className="vercel-footer-link">Licensing Tiers</a></li>
              <li><a href="#opening" className="vercel-footer-link">Aura Visualizer</a></li>
              <li><a href="#contact" className="vercel-footer-link">Audio Stems</a></li>
            </ul>
          </div>

          {/* Column 4: Company */}
          <div className="vercel-footer-col">
            <h4 className="vercel-footer-heading">Company</h4>
            <ul className="vercel-footer-links">
              <li><a href="#about" className="vercel-footer-link">About Q-CUBIC</a></li>
              <li><a href="#about" className="vercel-footer-link">Philosophy &amp; Craft</a></li>
              <li><a href="#contact" className="vercel-footer-link">Bengaluru Atelier</a></li>
              <li><a href="#about" className="vercel-footer-link">Press Kit</a></li>
              <li><a href="#experience" className="vercel-footer-link">Open Source Programs</a></li>
              <li><a href="#premium" className="vercel-footer-link">Pricing</a></li>
              <li><a href="#contact" className="vercel-footer-link">Help &amp; Concierge</a></li>
            </ul>
          </div>

          {/* Column 5: Legal & Trust */}
          <div className="vercel-footer-col">
            <h4 className="vercel-footer-heading">Legal &amp; Trust</h4>
            <ul className="vercel-footer-links">
              <li>
                <button type="button" className="vercel-footer-link" onClick={onOpenPrivacy}>
                  Privacy Policy
                </button>
              </li>
              <li>
                <button type="button" className="vercel-footer-link" onClick={onOpenTerms}>
                  Terms of Service
                </button>
              </li>
              <li>
                <button type="button" className="vercel-footer-link" onClick={onOpenPrivacy}>
                  Cookie Policy
                </button>
              </li>
              <li>
                <button type="button" className="vercel-footer-link" onClick={onOpenTerms}>
                  Hardware Binding SLA
                </button>
              </li>
              <li>
                <button type="button" className="vercel-footer-link" onClick={onOpenTerms}>
                  Acceptable Use Policy
                </button>
              </li>
              <li>
                <button type="button" className="vercel-footer-link" onClick={onOpenTerms}>
                  Trust Center
                </button>
              </li>
            </ul>
          </div>

          {/* Column 6: Social */}
          <div className="vercel-footer-col">
            <h4 className="vercel-footer-heading">Social</h4>
            <ul className="vercel-footer-links">
              <li><a href="https://github.com" target="_blank" rel="noreferrer" className="vercel-footer-link">GitHub</a></li>
              <li><a href="https://x.com" target="_blank" rel="noreferrer" className="vercel-footer-link">X</a></li>
              <li><a href="https://linkedin.com" target="_blank" rel="noreferrer" className="vercel-footer-link">LinkedIn</a></li>
              <li><a href="https://youtube.com" target="_blank" rel="noreferrer" className="vercel-footer-link">YouTube</a></li>
              <li><a href="https://instagram.com" target="_blank" rel="noreferrer" className="vercel-footer-link">Instagram</a></li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
};
