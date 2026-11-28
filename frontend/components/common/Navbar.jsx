import React, { useState, useEffect } from 'react';
import './navbar.css';

export const Navbar = ({ onOpenDashboard, onGetV2 }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('opening');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Navbar starts hidden when eyes are closed at top (scrollY <= 40).
      // As soon as user begins scrolling, eyes open, SACRED FRIENDS emerges,
      // and this navbar glides into view, STAYING FIXED across all pages down the site!
      const shouldShow = window.scrollY > 40;
      setIsVisible(shouldShow);

      // Section tracking for active state
      const sections = ['opening', 'about', 'journey', 'pantheon', 'premium', 'contact'];
      const scrollPos = window.scrollY + 250;

      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const closeMobile = () => setIsMobileOpen(false);

  return (
    <>
      <header
        className={`capsule-navbar ${isVisible ? 'visible' : ''}`}
        id="navbar"
        role="banner"
      >
        <div className="capsule-container">
          {/* Actual Sacred Friends Logo */}
          <a href="#opening" className="capsule-logo" aria-label="Sacred Friends Home" title="Sacred Friends">
            <img
              src="/assets/sacred_friends_logo.png"
              alt="Sacred Friends"
              className="capsule-logo-img"
            />
          </a>

          {/* Navigation Links (Desktop) */}
          <nav className="capsule-nav-desktop" aria-label="Main Navigation">
            <ul className="capsule-nav-list">
              <li>
                <a
                  href="#opening"
                  className={`capsule-nav-item ${activeSection === 'opening' ? 'active' : ''}`}
                >
                  Home
                </a>
              </li>
              <li>
                <a
                  href="#about"
                  className={`capsule-nav-item ${activeSection === 'about' ? 'active' : ''}`}
                >
                  About
                </a>
              </li>
              <li>
                <a
                  href="#journey"
                  className={`capsule-nav-item ${activeSection === 'journey' ? 'active' : ''}`}
                >
                  Product
                </a>
              </li>
              <li>
                <a
                  href="#pantheon"
                  className={`capsule-nav-item ${activeSection === 'pantheon' ? 'active' : ''}`}
                >
                  Character
                </a>
              </li>
              <li>
                <a
                  href="#premium"
                  className={`capsule-nav-item ${activeSection === 'premium' ? 'active' : ''}`}
                >
                  Pricing
                </a>
              </li>
              <li>
                <a
                  href="#contact"
                  className={`capsule-nav-item ${activeSection === 'contact' ? 'active' : ''}`}
                >
                  Contact
                </a>
              </li>
            </ul>
          </nav>

          {/* Actions: Black Pill Download CTA */}
          <div className="capsule-actions">
            <a
              href="/api/download/v1"
              className="capsule-download-btn"
              download
              title="Download Sacred Friends Free (.exe)"
            >
              Download
            </a>

            {/* Mobile Menu Hamburger */}
            <button
              type="button"
              className="capsule-mobile-toggle"
              aria-label="Toggle navigation menu"
              aria-expanded={isMobileOpen}
              onClick={() => setIsMobileOpen((prev) => !prev)}
            >
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <div
        className={`capsule-mobile-drawer ${isMobileOpen ? 'open' : ''}`}
        id="capsule-mobile-drawer"
        role="dialog"
        aria-label="Mobile Navigation"
      >
        <a href="#opening" className="mobile-drawer-link" onClick={closeMobile}>
          Home
        </a>
        <a href="#about" className="mobile-drawer-link" onClick={closeMobile}>
          About
        </a>
        <a href="#journey" className="mobile-drawer-link" onClick={closeMobile}>
          Product
        </a>
        <a href="#pantheon" className="mobile-drawer-link" onClick={closeMobile}>
          Character
        </a>
        <a href="#premium" className="mobile-drawer-link" onClick={closeMobile}>
          Pricing
        </a>
        <a href="#contact" className="mobile-drawer-link" onClick={closeMobile}>
          Contact
        </a>
        <div className="mobile-drawer-actions">
          <a
            href="/api/download/v1"
            className="capsule-download-btn"
            style={{ width: '100%', textAlign: 'center', boxSizing: 'border-box' }}
            download
            onClick={closeMobile}
          >
            Download Free (.exe)
          </a>
          <button
            type="button"
            className="mobile-dashboard-link"
            onClick={() => {
              closeMobile();
              onOpenDashboard?.();
            }}
          >
            Customer License Dashboard
          </button>
        </div>
      </div>
    </>
  );
};
