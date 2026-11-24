/**
 * Character Showcase Gallery (All 15 Original Sacred Friends)
 * Features:
 * - 3D CircularCarousel from React Bits for All 15 Companions
 * - Category filter support dynamically re-spinning the carousel
 * - Smooth transition between 3D Ring Carousel & Grid View
 * - Modal inspection of traits, lore, and sounds
 */
import { charactersData } from '../data/characters.js';
import { playCompanionSound } from './sacredAudio.js';
import { VanillaCircularCarousel } from './circularCarousel.js';

export function initGallery() {
  const carouselEl = document.getElementById('pantheon-circular-carousel');
  const carouselWrapper = document.getElementById('circular-carousel-wrapper');
  const gridContainer = document.getElementById('pantheon-grid') || document.getElementById('characters-grid');

  const btnModeCarousel = document.getElementById('btn-mode-carousel');
  const btnModeGrid = document.getElementById('btn-mode-grid');

  const modal = document.getElementById('companion-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalImg = document.getElementById('modal-character-img');
  const modalName = document.getElementById('modal-character-name');
  const modalTitle = document.getElementById('modal-character-title');
  const modalDesc = document.getElementById('modal-character-desc');
  const modalPersonality = document.getElementById('modal-personality');
  const modalNightAction = document.getElementById('modal-night-action');
  const modalSpecialSound = document.getElementById('modal-special-sound');
  const modalReminders = document.getElementById('modal-reminders');
  const modalMythology = document.getElementById('modal-mythology');
  const modalTag = document.getElementById('modal-character-tag');

  let currentFilter = 'all';
  let carouselInstance = null;

  // Initialize 3D Circular Carousel for all 15 characters
  if (carouselEl) {
    try {
      carouselInstance = new VanillaCircularCarousel(carouselEl, {
        items: charactersData,
        preset: 'cylinder',
        cardWidth: 220,
        cardHeight: 275,
        gap: 24,
        speed: 13,
        captions: true,
        pauseOnHover: true,
        focusOnClick: true,
        onItemClick: (item) => {
          if (item && item.id) {
            openCompanionModal(item.id);
          }
        }
      });
    } catch (err) {
      console.warn('Failed to init 3D CircularCarousel:', err);
    }
  }

  // View Mode Switcher (3D Ring vs Grid)
  btnModeCarousel?.addEventListener('click', () => {
    btnModeCarousel.classList.add('active');
    btnModeCarousel.style.background = 'linear-gradient(135deg, rgba(212, 175, 55, 0.3) 0%, rgba(254, 240, 138, 0.15) 100%)';
    btnModeCarousel.style.color = 'var(--color-gold-light)';

    btnModeGrid?.classList.remove('active');
    if (btnModeGrid) {
      btnModeGrid.style.background = 'transparent';
      btnModeGrid.style.color = 'var(--color-muted-stone)';
    }

    if (carouselWrapper) carouselWrapper.style.display = 'block';
    if (gridContainer) gridContainer.style.display = 'none';
    carouselInstance?.measure();
  });

  btnModeGrid?.addEventListener('click', () => {
    btnModeGrid.classList.add('active');
    btnModeGrid.style.background = 'linear-gradient(135deg, rgba(212, 175, 55, 0.3) 0%, rgba(254, 240, 138, 0.15) 100%)';
    btnModeGrid.style.color = 'var(--color-gold-light)';

    btnModeCarousel?.classList.remove('active');
    if (btnModeCarousel) {
      btnModeCarousel.style.background = 'transparent';
      btnModeCarousel.style.color = 'var(--color-muted-stone)';
    }

    if (carouselWrapper) carouselWrapper.style.display = 'none';
    if (gridContainer) gridContainer.style.display = 'grid';
  });

  // Render All 15 Deities in Grand Cinematic Showcase
  function renderGrid(category = 'all') {
    if (!gridContainer) return;
    currentFilter = category;

    const filtered = category === 'all'
      ? charactersData
      : charactersData.filter((c) => c.category === category);

    gridContainer.innerHTML = filtered
      .map(
        (c) => `
        <div class="deity-showcase" data-id="${c.id}" title="Click to inspect ${c.name} divine presence">
          <div class="deity-halo-glow" aria-hidden="true"></div>
          
          <div class="deity-img-box">
            <img 
              src="${c.defaultImage}" 
              alt="${c.name} — Desktop Companion" 
              class="deity-img-asset" 
              loading="lazy" 
            />
          </div>

          <span class="deity-category-pill">${c.categoryLabel}</span>
          <h3 class="deity-name-title">${c.name}</h3>
          <p class="deity-sacred-subtitle">${c.title}</p>

          <div class="deity-action-links">
            <button type="button" class="btn-deity-inspect" data-id="${c.id}" aria-label="Inspect ${c.name} sacred lore">
              Inspect Lore ✦
            </button>
            <a href="/api/download/v1" class="btn-deity-download action-download-v1" download aria-label="Download ${c.name} in Free Edition">
              Get Free (.exe)
            </a>
          </div>
        </div>
      `
      )
      .join('');

    // Attach click listeners to cards and buttons to open full traits modal
    gridContainer.querySelectorAll('.deity-showcase').forEach((card) => {
      card.addEventListener('click', (e) => {
        // If clicking download link, let download trigger normally
        if (e.target.closest('.btn-deity-download')) return;
        const id = card.getAttribute('data-id');
        openCompanionModal(id);
      });
    });

    gridContainer.querySelectorAll('.btn-deity-inspect').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        openCompanionModal(id);
      });
    });
  }

  // Bind Category Filter Buttons (Support both pantheon-filter-btn and filter-tab-btn)
  const filterBtns = document.querySelectorAll('.pantheon-filter-btn, .filter-tab-btn');
  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const selectedCategory = btn.getAttribute('data-category') || 'all';

      const filtered = selectedCategory === 'all'
        ? charactersData
        : charactersData.filter((c) => c.category === selectedCategory);

      carouselInstance?.setItems(filtered);
      renderGrid(selectedCategory);
    });
  });

  // Open Companion Details Modal
  function openCompanionModal(charId) {
    const char = charactersData.find((c) => c.id === charId);
    if (!char || !modal) return;

    if (modalImg) modalImg.src = char.defaultImage;
    if (modalName) modalName.textContent = char.name;
    if (modalTitle) modalTitle.textContent = char.title;
    if (modalTag) modalTag.textContent = char.categoryLabel;
    if (modalDesc) modalDesc.textContent = char.description;
    if (modalPersonality) modalPersonality.textContent = char.personality;
    if (modalNightAction) modalNightAction.textContent = char.nightAction;
    if (modalSpecialSound) modalSpecialSound.textContent = char.specialSoundAction;
    if (modalMythology) modalMythology.textContent = char.mythologyNote;

    const playSoundBtn = document.getElementById('modal-play-sound-btn');
    if (playSoundBtn) {
      playSoundBtn.onclick = () => {
        playCompanionSound(char.id);
      };
    }

    if (modalReminders) {
      if (char.reminderReactions && char.reminderReactions.length > 0) {
        modalReminders.innerHTML = char.reminderReactions
          .map(
            (r) =>
              `<div style="font-size: 0.8rem; margin-bottom: 0.35rem;"><strong style="color: var(--color-gold-light);">[${r.type}]:</strong> ${r.message} <em>(${r.action})</em></div>`
          )
          .join('');
      } else {
        modalReminders.textContent = 'Standard peaceful notifications and desktop greetings.';
      }
    }

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeCompanionModal() {
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  modalCloseBtn?.addEventListener('click', closeCompanionModal);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeCompanionModal();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal?.classList.contains('open')) {
      closeCompanionModal();
    }
  });

  // Initial render of all 15 characters
  renderGrid();
}
