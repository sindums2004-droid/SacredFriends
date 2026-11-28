/**
 * Sacred Friends — React Bits <AnimatedList /> Engine
 * Smooth spring-physics selection indicator, staggered pop/slide entrance,
 * edge gradient masks, and keyboard arrow navigation.
 */

const THEMES = {
  dark: {
    '--al-frame': 'rgba(15, 23, 42, 0.75)',
    '--al-frame-edge': 'rgba(212, 175, 55, 0.25)',
    '--al-frame-highlight': 'rgba(255, 255, 255, 0.1)',
    '--al-frame-shadow': '0 24px 48px -18px rgba(0, 0, 0, 0.85), 0 8px 20px -8px rgba(0, 0, 0, 0.6)',
    '--al-tile': 'linear-gradient(180deg, rgba(30, 41, 69, 0.7) 0%, rgba(15, 23, 42, 0.85) 100%)',
    '--al-tile-edge': 'rgba(255, 255, 255, 0.08)',
    '--al-tile-highlight': 'rgba(212, 175, 55, 0.2)',
    '--al-tile-shadow': '0 4px 14px -3px rgba(0, 0, 0, 0.6)',
    '--al-well': 'rgba(212, 175, 55, 0.12)',
    '--al-ink': '#f8fafc',
    '--al-muted': 'rgba(226, 232, 240, 0.65)',
    '--al-thumb': 'rgba(212, 175, 55, 0.35)',
    '--al-ring': 'rgba(212, 175, 55, 0.95)',
    '--al-ring-fill': 'rgba(212, 175, 55, 0.12)',
    '--al-hover': 'brightness(1.15)',
    '--al-press': 'brightness(0.9)',
    '--al-active': 'brightness(1.2)'
  }
};

const HIDDEN = {
  pop: { above: 'translate3d(0, -14px, 0) scale(0.85)', below: 'translate3d(0, 14px, 0) scale(0.85)' },
  slide: { above: 'translate3d(0, -28px, 0) scale(0.98)', below: 'translate3d(0, 28px, 0) scale(0.98)' },
  fade: { above: 'translate3d(0, -6px, 0)', below: 'translate3d(0, 6px, 0)' }
};

const SPRING =
  'linear(0, 0.0603, 0.2033, 0.3821, 0.5633, 0.7258, 0.8584, 0.9574, 1.0242, 1.0634, 1.0809, 1.0828, 1.0747, 1.0613, 1.046, 1.0313, 1.0186, 1.0085, 1.0012, 0.9965, 0.994, 0.9931, 0.9933, 0.9941, 0.9953, 0.9966, 0.9978, 0.9988, 1)';

const smootherstep = t => t * t * t * (t * (t * 6 - 15) + 10);

const FADE_MASK = (() => {
  const steps = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1];
  const top = steps.map(t => `rgba(0, 0, 0, ${smootherstep(t).toFixed(3)}) calc(var(--al-fade-top) * ${t})`);
  const bottom = [...steps]
    .reverse()
    .map(t => `rgba(0, 0, 0, ${smootherstep(t).toFixed(3)}) calc(100% - var(--al-fade-bottom) * ${t})`);
  return `linear-gradient(to bottom, ${[...top, ...bottom].join(', ')})`;
})();

/**
 * Creates and mounts an AnimatedList instance inside a DOM container.
 */
export function createAnimatedList(container, options = {}) {
  const {
    items = [],
    onItemSelect = null,
    initialSelectedIndex = 0,
    selectOnHover = true,
    enableArrowNavigation = true,
    loop = false,
    animation = 'pop',
    animateOnce = false,
    stagger = 0.04,
    showGradients = true,
    fadeSize = 48,
    displayScrollbar = true,
    frame = true,
    theme = 'dark',
    accentColor = 'rgba(212, 175, 55, 0.9)',
    radius = 12,
    gap = 8,
    width = '100%',
    maxHeight = 360,
    className = ''
  } = options;

  container.innerHTML = '';

  const root = document.createElement('div');
  root.className = `animated-list${frame ? ' animated-list--framed' : ''} ${className}`.trim();
  root.setAttribute('data-animated', animation !== 'none' ? '' : '');

  // Apply Theme CSS variables
  const themeVars = THEMES[theme] || THEMES.dark;
  Object.entries(themeVars).forEach(([k, v]) => root.style.setProperty(k, v));
  root.style.setProperty('--al-radius', `${radius}px`);
  root.style.setProperty('--al-gap', `${gap}px`);
  root.style.setProperty('--al-width', typeof width === 'number' ? `${width}px` : width);
  root.style.setProperty('--al-accent', accentColor);
  root.style.setProperty('--al-ring', accentColor);
  root.style.setProperty('--al-ring-fill', 'rgba(212, 175, 55, 0.1)');

  const viewport = document.createElement('div');
  viewport.className = `animated-list__viewport${displayScrollbar ? '' : ' animated-list__viewport--bare'}`;
  viewport.setAttribute('role', 'listbox');
  viewport.tabIndex = 0;
  viewport.style.maxHeight = typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight;
  if (showGradients) {
    viewport.style.maskImage = FADE_MASK;
    viewport.style.webkitMaskImage = FADE_MASK;
  }

  const track = document.createElement('div');
  track.className = 'animated-list__track';

  const itemElements = [];
  let selectedIndex = initialSelectedIndex;

  items.forEach((item, index) => {
    const entry = typeof item === 'object' ? item : { title: item };
    const isSelected = index === selectedIndex;

    const el = document.createElement('div');
    el.className = 'animated-list__item';
    el.setAttribute('role', 'option');
    el.setAttribute('aria-selected', isSelected ? 'true' : 'false');
    el.dataset.index = index;
    if (isSelected) el.setAttribute('data-selected', '');

    let contentHtml = '';
    if (entry.image || entry.icon) {
      contentHtml += `
        <span class="animated-list__lead">
          ${entry.image ? `<img src="${entry.image}" alt="${entry.title || ''}" draggable="false" />` : entry.icon}
        </span>
      `;
    }

    contentHtml += `
      <span class="animated-list__text">
        <span class="animated-list__title">${entry.title}</span>
        ${entry.description ? `<span class="animated-list__description">${entry.description}</span>` : ''}
      </span>
      ${entry.meta ? `<span class="animated-list__meta">${entry.meta}</span>` : ''}
      <span class="animated-list__rim" aria-hidden="true"></span>
    `;

    el.innerHTML = contentHtml;
    track.appendChild(el);
    itemElements.push(el);
  });

  // Spring physics indicator and ring
  const indicator = document.createElement('span');
  indicator.className = 'animated-list__indicator';
  indicator.setAttribute('aria-hidden', 'true');

  const ring = document.createElement('span');
  ring.className = 'animated-list__ring';
  indicator.appendChild(ring);
  track.appendChild(indicator);

  viewport.appendChild(track);
  root.appendChild(viewport);

  if (frame) {
    const frameRim = document.createElement('span');
    frameRim.className = 'animated-list__frame-rim';
    frameRim.setAttribute('aria-hidden', 'true');
    root.appendChild(frameRim);
  }

  container.appendChild(root);

  // --- Spring Physics & Motion Engine ---
  const motion = { y: 0, h: 0, vy: 0, vh: 0, ty: 0, th: 0, ready: false };
  let raf = 0;
  let lastTime = 0;
  let boxes = [];
  let entered = false;
  let engaged = false;
  let navigating = false;
  let pointer = [0, 0];

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const springEase = CSS.supports?.('transition-timing-function', 'linear(0, 1)')
    ? SPRING
    : 'cubic-bezier(0.34, 1.4, 0.64, 1)';
  const transition = `transform 600ms ${springEase}, opacity 300ms cubic-bezier(0.22, 1, 0.36, 1)`;

  function applyState(element, state) {
    element.dataset.state = state;
    const pose = animation !== 'none' && state !== 'in' ? HIDDEN[animation]?.[state] || '' : '';
    element.style.transform = pose;
    element.style.opacity = pose ? '0' : '';
  }

  function writeIndicator() {
    indicator.style.transform = `translate3d(0, ${motion.y.toFixed(2)}px, 0)`;
    indicator.style.height = `${motion.h.toFixed(2)}px`;
  }

  function frameLoop(now) {
    raf = 0;
    const dt = Math.min(0.05, (now - lastTime) / 1000 || 0);
    lastTime = now;
    const omega = 30;
    const zeta = 0.78;
    const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
    const h = dt / steps;

    for (let i = 0; i < steps; i++) {
      motion.vy += (omega * omega * (motion.ty - motion.y) - 2 * zeta * omega * motion.vy) * h;
      motion.vh += (omega * omega * (motion.th - motion.h) - 2 * zeta * omega * motion.vh) * h;
      motion.y += motion.vy * h;
      motion.h += motion.vh * h;
    }

    const moving =
      Math.abs(motion.ty - motion.y) > 0.05 ||
      Math.abs(motion.th - motion.h) > 0.05 ||
      Math.abs(motion.vy) + Math.abs(motion.vh) > 0.5;

    if (!moving) {
      motion.y = motion.ty;
      motion.h = motion.th;
      motion.vy = motion.vh = 0;
    }

    writeIndicator();
    if (moving) raf = requestAnimationFrame(frameLoop);
  }

  function placeIndicator(snap) {
    const item = itemElements[selectedIndex];
    if (!item) {
      indicator.style.opacity = '0';
      motion.ready = false;
      return;
    }
    indicator.style.opacity = '1';
    motion.ty = item.offsetTop;
    motion.th = item.offsetHeight;

    if (snap || reduced || !motion.ready) {
      motion.y = motion.ty;
      motion.h = motion.th;
      motion.vy = motion.vh = 0;
      motion.ready = true;
      writeIndicator();
      return;
    }

    if (!raf) {
      lastTime = performance.now();
      raf = requestAnimationFrame(frameLoop);
    }
  }

  function updateFades() {
    if (!showGradients) return;
    const span = Math.max(1, fadeSize);
    const { scrollTop, scrollHeight, clientHeight } = viewport;
    const top = Math.min(span, Math.max(0, scrollTop));
    const bottom = Math.min(span, Math.max(0, scrollHeight - clientHeight - scrollTop));
    viewport.style.setProperty('--al-fade-top', `${top.toFixed(1)}px`);
    viewport.style.setProperty('--al-fade-bottom', `${bottom.toFixed(1)}px`);
  }

  function measure() {
    const offset = track.offsetTop;
    boxes = itemElements.map(item => (item ? [offset + item.offsetTop, item.offsetHeight] : null));
  }

  function reveal(entrance) {
    if (!entered) return;
    const top = viewport.scrollTop;
    const view = viewport.clientHeight;
    let order = 0;

    itemElements.forEach((item, index) => {
      const box = boxes[index];
      if (!item || !box) return;
      const start = box[0] - top;
      const overlap = Math.min(view, start + box[1]) - Math.max(0, start);
      const hidden =
        animation !== 'none' && overlap < Math.min(box[1], view) * 0.5 && !(animateOnce && item.dataset.seen);
      const state = hidden ? (start + box[1] / 2 < view / 2 ? 'above' : 'below') : 'in';

      if (state === item.dataset.state) return;
      const delay = entrance && !hidden ? (order++ * Math.max(0, stagger)).toFixed(3) : 0;
      item.style.transitionDelay = delay ? `${delay}s, ${delay}s, 0s` : '';
      if (!hidden) item.dataset.seen = 'true';
      applyState(item, state);
    });
  }

  function syncEntrance() {
    itemElements.forEach(item => {
      item.style.transition = 'none';
      applyState(item, animation === 'none' ? 'in' : 'below');
    });
    void root.offsetHeight;
    itemElements.forEach(item => {
      item.style.transition = transition;
    });
    measure();
    reveal(true);
  }

  function setSelection(newIndex, triggeredByKeyboard = false) {
    if (newIndex < 0 || newIndex >= items.length) return;
    selectedIndex = newIndex;

    itemElements.forEach((el, idx) => {
      const isSel = idx === selectedIndex;
      el.setAttribute('aria-selected', isSel ? 'true' : 'false');
      if (isSel) el.setAttribute('data-selected', '');
      else el.removeAttribute('data-selected');
    });

    placeIndicator(false);
    onItemSelect?.(items[selectedIndex], selectedIndex);

    if (triggeredByKeyboard) {
      const item = itemElements[selectedIndex];
      if (item) {
        const top = track.offsetTop + item.offsetTop;
        const bottom = top + item.offsetHeight;
        const margin = Math.min(fadeSize, (viewport.clientHeight - item.offsetHeight) / 2);
        if (top < viewport.scrollTop + margin) {
          viewport.scrollTo({ top: Math.max(0, top - margin), behavior: 'smooth' });
        } else if (bottom > viewport.scrollTop + viewport.clientHeight - margin) {
          viewport.scrollTo({ top: bottom - viewport.clientHeight + margin, behavior: 'smooth' });
        }
      }
    }
  }

  // Event Listeners
  itemElements.forEach((el, index) => {
    el.addEventListener('pointerenter', () => {
      if (selectOnHover && !navigating) {
        setSelection(index, false);
      }
    });

    el.addEventListener('click', () => {
      setSelection(index, false);
    });
  });

  function onKey(e) {
    if (!enableArrowNavigation || e.defaultPrevented) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;

    const active = document.activeElement;
    const isFocused = active === viewport || root.contains(active);
    if (!isFocused && !engaged) return;

    let next = null;
    if (e.key === 'ArrowDown') next = selectedIndex < items.length - 1 ? selectedIndex + 1 : (loop ? 0 : selectedIndex);
    else if (e.key === 'ArrowUp') next = selectedIndex > 0 ? selectedIndex - 1 : (loop ? items.length - 1 : 0);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = items.length - 1;
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onItemSelect?.(items[selectedIndex], selectedIndex);
      return;
    }

    if (next !== null && next !== selectedIndex) {
      e.preventDefault();
      navigating = true;
      setSelection(next, true);
    }
  }

  function onPointerMove(e) {
    const moved = e.clientX !== pointer[0] || e.clientY !== pointer[1];
    pointer = [e.clientX, e.clientY];
    if (navigating && moved) navigating = false;
  }

  viewport.addEventListener('scroll', () => {
    updateFades();
    reveal(false);
  }, { passive: true });

  window.addEventListener('keydown', onKey);
  root.addEventListener('pointerenter', () => { engaged = true; });
  root.addEventListener('pointerleave', () => { engaged = false; });
  root.addEventListener('pointermove', onPointerMove);

  // Reveal with IntersectionObserver
  const observer = new IntersectionObserver((entries) => {
    if (entries.some(e => e.isIntersecting)) {
      observer.disconnect();
      entered = true;
      measure();
      reveal(true);
      placeIndicator(true);
      updateFades();
    }
  }, { rootMargin: '0px 0px -10% 0px' });

  observer.observe(root);
  syncEntrance();

  return {
    root,
    setSelected(index) {
      setSelection(index, false);
    },
    destroy() {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('keydown', onKey);
    }
  };
}
