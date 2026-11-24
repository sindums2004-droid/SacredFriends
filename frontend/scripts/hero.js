/**
 * Hero Section Interactions
 * Interactive Three.js 3D Model & Deity Companion Viewer
 */
import { charactersData } from '../data/characters.js';
import { ThreeModelViewer } from './threeModelViewer.js';

export function initHero() {
  const heroCard = document.getElementById('hero-character-card');
  const heroName = document.getElementById('hero-character-name');
  const heroSubtitle = document.getElementById('hero-character-subtitle');
  const switcherBtns = document.querySelectorAll('.hero-switcher-btn');

  let viewer = null;
  if (heroCard) {
    try {
      viewer = new ThreeModelViewer(heroCard, {
        autoRotate: false,
        dragRotate: true,
        hoverTilt: 0,
        float: 0,
        shadow: true,
        zoom: true,
        minZoom: 0.75,
        maxZoom: 1.6
      });

      // Load initial character
      viewer.loadCharacter('/assets/characters/portraits/durga.png');
    } catch (e) {
      console.warn('ThreeModelViewer fallback to static artwork:', e);
    }
  }

  // Hero Deity Switcher
  switcherBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const charId = btn.getAttribute('data-char');
      const found = charactersData.find((c) => c.id === charId);
      if (!found) return;

      switcherBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      if (heroName) heroName.textContent = found.name;
      if (heroSubtitle) heroSubtitle.textContent = found.title;

      if (viewer) {
        viewer.loadCharacter(found.defaultImage);
      }
    });
  });
}

