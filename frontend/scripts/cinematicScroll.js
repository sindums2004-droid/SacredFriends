/**
 * Sacred Friends — Cinematic Scroll Experience Engine
 * Handles smooth scene reveals, celestial lighting shifts, and modal interactions
 */

export function initCinematicScroll() {
  const realms = document.querySelectorAll('.cinematic-realm');
  const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');
  const dashboardModal = document.getElementById('dashboard-modal');
  const dashboardCloseBtn = document.getElementById('dashboard-close-btn');
  const dashboardTriggers = document.querySelectorAll('.action-open-dashboard');

  // 1. Smooth Scroll Observer for Cinematic Reveals
  if ('IntersectionObserver' in window) {
    const realmObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('realm-visible');

            const id = entry.target.getAttribute('id');
            if (id) {
              navLinks.forEach((link) => {
                const href = link.getAttribute('href');
                if (href === `#${id}`) {
                  link.classList.add('active');
                } else if (href && href.startsWith('#')) {
                  link.classList.remove('active');
                }
              });
            }
          }
        });
      },
      {
        threshold: 0.25,
        rootMargin: '0px 0px -10% 0px'
      }
    );

    realms.forEach((realm) => {
      realmObserver.observe(realm);
    });
  }

  // 2. Smooth Scroll for Explore & Navigation Buttons
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (!targetId || targetId === '#' || targetId.startsWith('#modal')) return;

      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        targetEl.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });

  // 3. Customer Dashboard Modal Controller
  function openDashboard() {
    if (dashboardModal) {
      dashboardModal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeDashboard() {
    if (dashboardModal) {
      dashboardModal.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  dashboardTriggers.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openDashboard();
    });
  });

  dashboardCloseBtn?.addEventListener('click', closeDashboard);
  dashboardModal?.addEventListener('click', (e) => {
    if (e.target === dashboardModal) {
      closeDashboard();
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dashboardModal?.classList.contains('open')) {
      closeDashboard();
    }
  });

  // Expose to window for direct calls if needed
  window.openCustomerDashboard = openDashboard;
  window.closeCustomerDashboard = closeDashboard;
}

