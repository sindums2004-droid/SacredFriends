import React, { useState } from 'react';
import { ToastProvider } from './context/ToastContext.jsx';
import { AudioProvider } from './context/AudioContext.jsx';

import { CelestialCanvas } from './components/common/CelestialCanvas.jsx';
import { Navbar } from './components/common/Navbar.jsx';
import { Footer } from './components/common/Footer.jsx';
import { Toast } from './components/common/Toast.jsx';

import { Home } from './components/home/Home.jsx';
import { Experience } from './components/experience/Experience.jsx';
import { Character } from './components/character/Character.jsx';
import { Pricing } from './components/pricing/Pricing.jsx';
import { About } from './components/about/About.jsx';
import { Contact } from './components/contact/Contact.jsx';

import { CompanionModal } from './components/modals/CompanionModal.jsx';
import { DashboardModal } from './components/modals/DashboardModal.jsx';
import { CheckoutModal } from './components/modals/CheckoutModal.jsx';
import { LegalModals } from './components/modals/LegalModals.jsx';

export const App = () => {
  const [selectedCompanion, setSelectedCompanion] = useState(null);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  return (
    <ToastProvider>
      <AudioProvider>
        {/* Accessible Skip Link */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        {/* Interactive Celestial Foreground Particle Layer */}
        <CelestialCanvas />

        {/* Ambient Cinematic Depth Glows */}
        <div className="ambient-glow-layer" aria-hidden="true">
          <div className="ambient-glow-top" />
          <div className="ambient-glow-center" />
        </div>

        {/* Global Floating Glass Capsule Navbar (Appears on scroll & fixed across all pages) */}
        <Navbar
          onGetV2={() => setCheckoutOpen(true)}
          onOpenDashboard={() => setDashboardOpen(true)}
        />

        {/* Main Content Realm */}
        <main id="main-content">
          <Home />
          <About />
          <Experience />
          <Character onInspectCompanion={(comp) => setSelectedCompanion(comp)} />
          <Pricing
            onGetV2={() => setCheckoutOpen(true)}
            onOpenDashboard={() => setDashboardOpen(true)}
          />
          <Contact />
        </main>

        {/* Studio Footer */}
        <Footer
          onOpenDashboard={() => setDashboardOpen(true)}
          onOpenTerms={() => setTermsOpen(true)}
          onOpenPrivacy={() => setPrivacyOpen(true)}
        />

        {/* Floating Notification Toast */}
        <Toast />

        {/* Modals & Dialogs */}
        <CompanionModal
          companion={selectedCompanion}
          isOpen={!!selectedCompanion}
          onClose={() => setSelectedCompanion(null)}
        />

        <DashboardModal
          isOpen={dashboardOpen}
          onClose={() => setDashboardOpen(false)}
        />

        <CheckoutModal
          isOpen={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          onOpenDashboard={() => {
            setCheckoutOpen(false);
            setDashboardOpen(true);
          }}
        />

        <LegalModals
          termsOpen={termsOpen}
          privacyOpen={privacyOpen}
          onCloseTerms={() => setTermsOpen(false)}
          onClosePrivacy={() => setPrivacyOpen(false)}
        />
      </AudioProvider>
    </ToastProvider>
  );
};
