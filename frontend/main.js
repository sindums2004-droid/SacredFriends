/**
 * Sacred Friends by Q-CUBIC — Master JavaScript Entrypoint
 * The Divine Desktop Companion Experience
 */
import './styles/tokens.css';
import './styles/main.css';
import './styles/cinematic.css';
import './components/CircularCarousel.css';
import './components/ReflectiveCard.css';
import './components/AnimatedList.css';

import { initNavbar } from './scripts/navbar.js';
import { initCanvasParticles } from './scripts/canvasParticles.js';
import { initHero } from './scripts/hero.js';
import { initGallery } from './scripts/gallery.js';
import { initDesktopMockup } from './scripts/desktopMockup.js';
import { initV1Download } from './scripts/v1Download.js';
import { initV2Commerce } from './scripts/v2Commerce.js';
import { initLegalModals } from './scripts/legalModals.js';
import { initCinematicScroll } from './scripts/cinematicScroll.js';
import { initSacredAudio } from './scripts/sacredAudio.js';
import { initHeroLightRays } from './scripts/lightRays.js';
import { initContact } from './scripts/contact.js';
import { initContactCarousel } from './scripts/contactCarousel.js';
import { initReflectiveCards } from './scripts/reflectiveCard.js';
import { initExperienceAnimatedList } from './scripts/animatedList.js';

document.addEventListener('DOMContentLoaded', () => {
  const main = document.getElementById('main-content');
  const orderedSectionIds = ['opening', 'about', 'pantheon', 'journey', 'premium', 'contact'];
  const orderedSections = orderedSectionIds
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  orderedSections.forEach((section) => main?.appendChild(section));

  initNavbar();
  initCanvasParticles();
  initHero();
  initGallery();
  initDesktopMockup();
  initV1Download();
  initV2Commerce();
  initLegalModals();
  initCinematicScroll();
  initSacredAudio();
  initHeroLightRays();
  initContact();
  initContactCarousel();
  initReflectiveCards();
  initExperienceAnimatedList();

  console.log('🕉️ Sacred Friends by Q-CUBIC — Cinematic Divine Journey Engine & Sacred Audio Active.');
});

