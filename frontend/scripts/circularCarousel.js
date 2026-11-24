/**
 * Vanilla ES Module CircularCarousel Engine for Sacred Friends Pantheon
 * Ported directly from React Bits <CircularCarousel /> specification
 * Features:
 * - 3D Cylinder preset with 15 cards
 * - Real-time continuous drift autoplay
 * - Drag & throw with velocity, momentum & spring snap
 * - Parallax mouse leaning
 * - Smooth focus-on-click to bring card to front
 * - Live digit reel counter (01 / 15) and deity captions
 * - Category filtering support (recalculating ring geometry dynamically)
 */

const TO_RAD = Math.PI / 180;
const clamp = (val, min, max) => Math.min(max, Math.max(min, val));
const wrap = deg => ((((deg + 180) % 360) + 360) % 360) - 180;
const SPRING = 118;

export class VanillaCircularCarousel {
  constructor(container, options = {}) {
    this.container = container;
    this.items = options.items || [];
    this.onItemClick = options.onItemClick || null;
    this.onChange = options.onChange || null;

    this.options = {
      cardWidth: options.cardWidth || 220,
      cardHeight: options.cardHeight || 270,
      gap: options.gap || 25,
      tilt: options.tilt !== undefined ? options.tilt : -5,
      perspective: options.perspective || 2400,
      speed: options.speed || 12,
      momentum: options.momentum || 0.6,
      autoplay: options.autoplay !== undefined ? options.autoplay : true,
      pauseOnHover: options.pauseOnHover !== undefined ? options.pauseOnHover : true,
      focusOnClick: options.focusOnClick !== undefined ? options.focusOnClick : true,
      captions: options.captions !== undefined ? options.captions : true,
      ...options
    };

    this.state = {
      angle: 0,
      velocity: 0,
      target: null,
      dir: -1,
      press: null,
      drag: false,
      hover: false,
      pointer: { inside: false, x: 0, y: 0 },
      yaw: 0,
      pitch: 0,
      active: 0,
      last: 0
    };

    this.cardElements = [];
    this.init();
  }

  setItems(newItems) {
    this.items = newItems;
    this.buildDOM();
    this.measure();
  }

  init() {
    this.container.classList.add('circular-carousel');
    this.container.setAttribute('tabindex', '0');
    this.container.setAttribute('data-draggable', '');

    this.buildDOM();
    this.bindEvents();

    this.measure();
    this.lastTime = performance.now();
    this.animLoop = this.animLoop.bind(this);
    this.rafId = requestAnimationFrame(this.animLoop);
  }

  buildDOM() {
    this.container.innerHTML = '';
    const count = this.items.length;
    if (count === 0) return;

    this.view = document.createElement('div');
    this.view.className = 'circular-carousel__view';

    this.stage = document.createElement('div');
    this.stage.className = 'circular-carousel__stage';

    this.camera = document.createElement('div');
    this.camera.className = 'circular-carousel__camera';

    this.ring = document.createElement('div');
    this.ring.className = 'circular-carousel__ring';

    this.cardElements = [];

    this.items.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'circular-carousel__card';
      card.setAttribute('data-cc-index', index);
      card.setAttribute('role', 'group');
      card.setAttribute('aria-label', `${item.name || item.title}, ${index + 1} of ${count}`);

      card.innerHTML = `
        <div class="circular-carousel__frame" style="left: ${-this.options.cardWidth / 2}px; top: ${-this.options.cardHeight / 2}px; width: ${this.options.cardWidth}px; height: ${this.options.cardHeight}px; border-radius: 18px;">
          <div class="cc-card-halo"></div>
          <img class="circular-carousel__photo" src="${item.defaultImage || item.src}" alt="${item.name || ''}" draggable="false" style="width: 100%; height: 100%; object-fit: contain; padding: 16px;" />
          <div class="cc-card-badge">${item.categoryLabel || 'Companion'}</div>
          <div class="cc-card-bottom-info">
            <h4 class="cc-card-name">${item.name}</h4>
            <span class="cc-card-sub">${item.title}</span>
          </div>
          <div class="circular-carousel__shade"></div>
        </div>
      `;

      this.ring.appendChild(card);
      this.cardElements.push(card);
    });

    this.camera.appendChild(this.ring);
    this.stage.appendChild(this.camera);
    this.view.appendChild(this.stage);
    this.container.appendChild(this.view);
    this.container.setAttribute('data-ready', '');

    if (this.options.captions) {
      this.caption = document.createElement('div');
      this.caption.className = 'circular-carousel__caption';
      this.caption.innerHTML = `
        <div class="circular-carousel__title">
          <span class="cc-cap-name">${this.items[0]?.name || ''}</span>
          <span class="circular-carousel__subtitle cc-cap-sub">${this.items[0]?.title || ''}</span>
        </div>
        <div class="circular-carousel__count">
          <span class="cc-counter-current">01</span>
          <span class="circular-carousel__slash">/</span>
          <span>${String(count).padStart(2, '0')}</span>
        </div>
      `;
      this.container.appendChild(this.caption);
    }
  }

  measure() {
    const count = this.items.length;
    if (count === 0) return;

    const width = this.container.clientWidth || 800;
    const along = this.options.cardWidth;
    const pitch = along + this.options.gap;
    const n = Math.max(count, 3);
    const chord = pitch / (2 * Math.sin(Math.PI / n));
    this.radius = Math.max(chord, along * 0.85);

    this.step = 360 / count;

    const P = this.options.perspective;
    this.stage.style.perspective = `${P}px`;

    // Scale ring to fit nicely within container width
    const targetWidth = width * 0.95;
    const ringSpan = this.radius * 2 + this.options.cardWidth;
    const captionSpace = this.options.captions ? 88 : 0;
    const availableHeight = Math.max(1, this.container.clientHeight - captionSpace);
    const fit = Math.min(1.05, targetWidth / ringSpan, availableHeight / (this.options.cardHeight + 48));
    this.stage.style.bottom = `${captionSpace}px`;
    this.stage.style.transform = `scale(${fit})`;
  }

  bindEvents() {
    const root = this.container;

    const updatePointer = (e) => {
      const rect = root.getBoundingClientRect();
      this.state.pointer.x = clamp(((e.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
      this.state.pointer.y = clamp(((e.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
    };

    root.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse') this.state.hover = true;
    });

    root.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse') {
        this.state.hover = false;
        this.state.pointer.inside = false;
        this.state.pointer.x = 0;
        this.state.pointer.y = 0;
      }
    });

    root.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      this.state.press = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        angle: this.state.angle,
        moved: false,
        origin: 0,
        samples: [{ time: performance.now(), angle: this.state.angle }]
      };
    });

    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse') {
        this.state.pointer.inside = true;
        updatePointer(e);
      }

      const press = this.state.press;
      if (!press || press.id !== e.pointerId) return;

      const delta = e.clientX - press.x;
      if (!press.moved) {
        if (Math.abs(delta) < 6) return;
        press.moved = true;
        press.origin = delta;
        this.state.drag = true;
        this.state.target = null;
        this.state.velocity = 0;
        root.setAttribute('data-dragging', '');
      }

      const perPixel = 180 / (Math.PI * this.radius);
      this.state.angle = press.angle + (delta - press.origin) * perPixel;
      const now = performance.now();
      press.samples.push({ time: now, angle: this.state.angle });
      while (press.samples.length > 2 && now - press.samples[0].time > 110) press.samples.shift();
    });

    const onRelease = (e) => {
      const press = this.state.press;
      if (!press || press.id !== e.pointerId) return;
      this.state.press = null;
      root.removeAttribute('data-dragging');

      if (!press.moved) return;
      this.state.drag = false;

      const first = press.samples[0];
      const last = press.samples[press.samples.length - 1];
      const span = (last.time - first.time) / 1000;
      const velocity = span > 0.008 ? clamp((last.angle - first.angle) / span, -1200, 1200) : 0;
      this.state.velocity = velocity;
      if (Math.abs(velocity) > 40) this.state.dir = Math.sign(velocity);

      // Snap target
      const tau = 0.18 + this.options.momentum * 1.5;
      this.state.target = Math.round((this.state.angle + velocity * tau * 0.5) / this.step) * this.step;
    };

    window.addEventListener('pointerup', onRelease);
    window.addEventListener('pointercancel', onRelease);

    root.addEventListener('click', (e) => {
      const card = e.target.closest('[data-cc-index]');
      if (!card) return;
      const index = Number(card.getAttribute('data-cc-index'));

      if (this.options.focusOnClick) {
        this.focusIndex(index);
      }

      this.onItemClick?.(this.items[index], index);
    });

    this.resizeObserver = new ResizeObserver(() => this.measure());
    this.resizeObserver.observe(this.container);
  }

  focusIndex(index) {
    const count = this.items.length;
    let target = -index * this.step;
    target += 360 * Math.round((this.state.angle - target) / 360);
    this.state.target = target;
  }

  animLoop(now) {
    this.rafId = requestAnimationFrame(this.animLoop);
    const dt = Math.min((now - this.state.last) / 1000, 0.05);
    this.state.last = now;

    const count = this.items.length;
    if (count === 0) return;

    const paused = (this.options.pauseOnHover && this.state.hover) || this.state.drag;
    const cruise = this.options.autoplay && !paused ? this.options.speed * this.state.dir : 0;

    if (!this.state.drag) {
      if (this.state.target !== null) {
        let remaining = dt;
        const damping = 2 * Math.sqrt(SPRING);
        while (remaining > 0) {
          const h = Math.min(remaining, 1 / 240);
          const accel = SPRING * (this.state.target - this.state.angle) - damping * this.state.velocity;
          this.state.velocity += accel * h;
          this.state.angle += this.state.velocity * h;
          remaining -= h;
        }
        if (Math.abs(this.state.target - this.state.angle) < 0.005 && Math.abs(this.state.velocity) < 0.04) {
          this.state.angle = this.state.target;
          this.state.velocity = 0;
          this.state.target = null;
        }
      } else {
        const tau = 0.2 + this.options.momentum * 1.5;
        this.state.velocity += (cruise - this.state.velocity) * (1 - Math.exp(-dt / tau));
        this.state.angle += this.state.velocity * dt;
        if (cruise === 0 && Math.abs(this.state.velocity) < 8) {
          this.state.target = Math.round(this.state.angle / this.step) * this.step;
        }
      }
    }

    // Parallax easing
    const ease = 1 - Math.exp(-dt / 0.35);
    const aimYaw = this.state.pointer.inside ? this.state.pointer.x * 6 : 0;
    const aimPitch = this.state.pointer.inside ? -this.state.pointer.y * 4 : 0;
    this.state.yaw += (aimYaw - this.state.yaw) * ease;
    this.state.pitch += (aimPitch - this.state.pitch) * ease;

    // Render Camera & Ring
    const R = this.radius;
    this.camera.style.transform = `translate3d(0, 0, ${-R}px) rotateX(${this.options.tilt + this.state.pitch}deg) rotateY(${this.state.yaw}deg)`;
    this.ring.style.transform = `rotateY(${this.state.angle}deg)`;

    // Render each card
    for (let i = 0; i < count; i++) {
      const card = this.cardElements[i];
      if (!card) continue;

      const base = i * this.step;
      card.style.transform = `rotateY(${base}deg) translateZ(${R}px)`;

      const world = wrap(base + this.state.angle);
      const facing = Math.cos(world * TO_RAD);
      const fade = 0.55 * Math.pow((1 - facing) / 2, 1.25);
      card.style.setProperty('--cc-depth', fade.toFixed(3));
    }

    // Active Index
    const index = ((Math.round(-this.state.angle / this.step) % count) + count) % count || 0;
    if (index !== this.state.active) {
      this.state.active = index;
      this.updateCaption(index);
      this.onChange?.(index);
    }
  }

  updateCaption(index) {
    if (!this.caption) return;
    const item = this.items[index];
    if (!item) return;

    const nameEl = this.caption.querySelector('.cc-cap-name');
    const subEl = this.caption.querySelector('.cc-cap-sub');
    const countEl = this.caption.querySelector('.cc-counter-current');

    if (nameEl) nameEl.textContent = item.name;
    if (subEl) subEl.textContent = item.title;
    if (countEl) countEl.textContent = String(index + 1).padStart(2, '0');
  }

  destroy() {
    cancelAnimationFrame(this.rafId);
    this.resizeObserver?.disconnect();
  }
}
