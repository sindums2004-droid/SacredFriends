const COMPANIONS = ['Durga Maa', 'Ganesha', 'Krishna', 'Shiva', 'Hanuman', 'Saraswati'];

export function initContactCarousel() {
  const carousel = document.getElementById('contact-companion-carousel');
  if (!carousel) return;

  const ring = carousel.querySelector('.contact-carousel-ring');
  const cards = Array.from(carousel.querySelectorAll('.contact-carousel-card'));
  const title = document.getElementById('contact-carousel-title');
  const count = document.getElementById('contact-carousel-count');
  const controls = carousel.querySelectorAll('[data-carousel-direction]');
  if (!ring || cards.length !== COMPANIONS.length || !title || !count) return;

  const step = 360 / cards.length;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let angle = 0;
  let activeIndex = 0;
  let drag = null;
  let suppressClick = false;
  let autoplayTimer = 0;
  let pointerInside = false;
  let isVisible = false;

  function setActive(index, snap = true) {
    activeIndex = (index + cards.length) % cards.length;
    if (snap) {
      const target = -activeIndex * step;
      angle = target + 360 * Math.round((angle - target) / 360);
    }

    ring.style.transform = `rotateY(${angle}deg)`;
    title.textContent = COMPANIONS[activeIndex];
    count.textContent = `${String(activeIndex + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;

    cards.forEach((card, index) => {
      const distance = Math.cos((index * step + angle) * Math.PI / 180);
      card.setAttribute('aria-pressed', String(index === activeIndex));
      card.style.setProperty('--carousel-depth', String(Math.max(0, distance)));
      card.style.zIndex = String(Math.round((distance + 1) * 10));
    });
  }

  function stepBy(direction) {
    setActive(activeIndex + direction);
  }

  function stopAutoplay() {
    window.clearInterval(autoplayTimer);
    autoplayTimer = 0;
  }

  function syncAutoplay() {
    stopAutoplay();
    if (isVisible && !pointerInside && !reducedMotion.matches) {
      autoplayTimer = window.setInterval(() => stepBy(1), 4200);
    }
  }

  function finishDrag(event) {
    if (!drag) return;
    if (event && drag.id !== event.pointerId) return;
    const moved = drag.moved;
    drag = null;
    carousel.removeAttribute('data-dragging');
    suppressClick = moved;
    window.setTimeout(() => {
      suppressClick = false;
    }, 0);
    const index = ((Math.round(-angle / step) % cards.length) + cards.length) % cards.length;
    setActive(index);
    syncAutoplay();
  }

  controls.forEach(button => {
    button.addEventListener('click', () => {
      stepBy(Number(button.dataset.carouselDirection));
      syncAutoplay();
    });
  });

  cards.forEach((card, index) => {
    card.addEventListener('click', event => {
      if (suppressClick) {
        event.preventDefault();
        return;
      }
      setActive(index);
      syncAutoplay();
    });
  });

  carousel.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') stepBy(1);
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') stepBy(-1);
    else if (event.key === 'Home') setActive(0);
    else if (event.key === 'End') setActive(cards.length - 1);
    else return;
    event.preventDefault();
    syncAutoplay();
  });

  carousel.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.target.closest('.contact-carousel-controls')) return;
    drag = { id: event.pointerId, startX: event.clientX, startAngle: angle, moved: false };
    carousel.setPointerCapture(event.pointerId);
    stopAutoplay();
  });

  carousel.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const delta = event.clientX - drag.startX;
    if (Math.abs(delta) > 4) {
      drag.moved = true;
      carousel.setAttribute('data-dragging', '');
    }
    if (!drag.moved) return;

    angle = drag.startAngle + delta * 0.45;
    ring.style.transform = `rotateY(${angle}deg)`;
    const nearest = ((Math.round(-angle / step) % cards.length) + cards.length) % cards.length;
    setActive(nearest, false);
  });

  carousel.addEventListener('pointerup', event => {
    if (drag?.id === event.pointerId) finishDrag();
  });
  carousel.addEventListener('pointercancel', finishDrag);
  carousel.addEventListener('pointerenter', () => {
    pointerInside = true;
    syncAutoplay();
  });
  carousel.addEventListener('pointerleave', () => {
    pointerInside = false;
    syncAutoplay();
  });
  reducedMotion.addEventListener?.('change', syncAutoplay);

  const visibility = new IntersectionObserver(([entry]) => {
    isVisible = entry.isIntersecting;
    syncAutoplay();
  });
  visibility.observe(carousel);

  setActive(0);
}
