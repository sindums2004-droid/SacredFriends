import React from 'react';
import './tech-marquee.css';

const MARQUEE_ITEMS = [
  'Windows 11 Native Architecture',
  '432Hz Lossless Ambient Stems',
  '1-Device Cryptographic Lock',
  '100% Offline & Zero Telemetry',
  '15 Handcrafted Divine Archetypes',
  'DirectX 60 FPS Canvas Engine',
  'Q-CUBIC Bengaluru Atelier',
  'Instant Windows System Tray Minimization'
];

export const TechMarquee = () => {
  return (
    <div className="tech-marquee-wrapper" aria-hidden="true">
      <div className="tech-marquee-gradient-left" />
      <div className="tech-marquee-gradient-right" />

      <div className="tech-marquee-track">
        {/* Double array for seamless continuous infinite scroll */}
        {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, idx) => (
          <div key={idx} className="tech-marquee-item">
            <span className="accent-dot">✦</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
