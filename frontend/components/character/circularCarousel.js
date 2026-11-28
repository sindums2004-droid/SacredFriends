/**
 * Cylindrical Arched Ribbon Carousel Engine for Sacred Friends Pantheon
 * - Silky smooth exponential deceleration & acceleration physics
 * - Interactive 3D Card Hover Tilt (tracking mouse coordinates with spring lerp)
 * - Dynamic iridescent specular reflection sheen (.curved-card-shine)
 * - 3D levitation forward-lift on hover
 * - 1:1 draggable with pointer / touch with natural momentum fling (95% decay/s)
 * - Seamless looping across all 15 Sacred Friends
 * - Feathered edge gradient mask with calibrated fade (zero edge cutting)
 * - Interactive companion click to inspect
 */

export class VanillaCircularCarousel {
  constructor(container, options = {}) {
    this.container = container;
    this.items = options.items || [];
    this.onItemClick = options.onItemClick || null;
    this.onChange = options.onChange || null;

    this.options = {
      cardWidth: options.cardWidth || 215,
      cardHeight: options.cardHeight || 305,
      pitch: 232,
      autoSpeed: 36, // cruise speed in px/s
      velocityDecay: 0.95, // 95% decay per second
      captions: options.captions !== undefined ? options.captions : true,
      pauseOnHover: options.pauseOnHover !== undefined ? options.pauseOnHover : true,
      ...options
    };

    this.scrollOffset = 0;
    this.velocity = 0;
    this.currentCruiseSpeed = -this.options.autoSpeed;
    this.isDragging = false;
    this.hoveredIndex = null;
    this.hoverProgress = new Array(40).fill(0);
    this.targetTiltX = 0;
    this.targetTiltY = 0;
    this.tiltX = 0;
    this.tiltY = 0;
    this.shineX = 50;
    this.shineY = 50;
    this.lastPointerX = 0;
    this.dragDistance = 0;
    this.lastTime = performance.now();
    this.activeIndex = 0;
    this.cardElements = [];

    this.init();
  }

  setItems(newItems) {
    this.items = newItems;
    this.buildDOM();
  }

  init() {
    this.container.classList.add('circular-carousel');
    this.container.style.position = 'relative';
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.overflow = 'hidden';
    this.container.style.cursor = 'grab';
    this.container.style.userSelect = 'none';
    this.container.style.webkitUserSelect = 'none';

    this.buildDOM();
    this.bindEvents();

    this.lastTime = performance.now();
    this.renderLoop = this.renderLoop.bind(this);
    this.rafId = requestAnimationFrame(this.renderLoop);
  }

  buildDOM() {
    this.container.innerHTML = '';
    const count = this.items.length;
    if (count === 0) return;

    this.stage = document.createElement('div');
    this.stage.className = 'curved-carousel-stage';
    this.stage.style.position = 'absolute';
    this.stage.style.inset = '0';
    this.stage.style.pointerEvents = 'auto';
    this.stage.style.perspective = '1200px';
    this.stage.style.perspectiveOrigin = '50% 50%';
    this.stage.style.transformStyle = 'preserve-3d';

    // Feathered bilateral edge gradient mask for seamless edge dissolves
    this.stage.style.maskImage = 'linear-gradient(to right, transparent 0%, #000000 8%, #000000 92%, transparent 100%)';
    this.stage.style.webkitMaskImage = 'linear-gradient(to right, transparent 0%, #000000 8%, #000000 92%, transparent 100%)';

    this.cardElements = [];
    this.hoverProgress = new Array(count).fill(0);

    this.items.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'curved-carousel-card';
      card.setAttribute('data-index', index);
      card.style.position = 'absolute';
      card.style.left = '0';
      card.style.top = '0';
      card.style.width = `${this.options.cardWidth}px`;
      card.style.height = `${this.options.cardHeight}px`;
      card.style.willChange = 'transform, opacity';
      card.style.cursor = 'pointer';

      card.innerHTML = `
        <div class="curved-card-inner">
          <div class="curved-card-glow"></div>
          <div class="curved-card-shine"></div>
          <div class="curved-card-badge">${item.categoryLabel || 'Companion'}</div>
          <div class="curved-card-avatar-wrap">
            <img class="curved-card-img" src="${item.defaultImage || item.src}" alt="${item.name || ''}" draggable="false" />
          </div>
          <div class="curved-card-info">
            <h4 class="curved-card-name">${item.name}</h4>
            <span class="curved-card-sub">${item.title}</span>
          </div>
        </div>
      `;

      // Track individual card hover & 3D tilt
      card.addEventListener('pointerenter', () => {
        this.hoveredIndex = index;
      });

      card.addEventListener('pointerleave', () => {
        if (this.hoveredIndex === index) {
          this.hoveredIndex = null;
          this.targetTiltX = 0;
          this.targetTiltY = 0;
        }
      });

      card.addEventListener('pointermove', (e) => {
        if (this.isDragging) return;
        const rect = card.getBoundingClientRect();
        const px = ((e.clientX - rect.left) / rect.width) * 2 - 1; // -1 to +1
        const py = ((e.clientY - rect.top) / rect.height) * 2 - 1; // -1 to +1

        // Smooth interactive 3D tilt angles
        this.targetTiltX = -py * 12; // rotateX
        this.targetTiltY = px * 15;  // rotateY
        this.shineX = (px + 1) * 50;
        this.shineY = (py + 1) * 50;
      });

      this.stage.appendChild(card);
      this.cardElements.push(card);
    });

    this.container.appendChild(this.stage);

    if (this.options.captions) {
      this.caption = document.createElement('div');
      this.caption.className = 'curved-carousel-caption';
      this.caption.innerHTML = `
        <div class="curved-caption-title">
          <span class="curved-cap-name">${this.items[0]?.name || ''}</span>
          <span class="curved-cap-sub">${this.items[0]?.title || ''}</span>
        </div>
        <div class="curved-caption-count">
          <span class="curved-count-current">01</span>
          <span class="curved-count-slash">/</span>
          <span>${String(count).padStart(2, '0')}</span>
        </div>
      `;
      this.container.appendChild(this.caption);
    }
  }

  bindEvents() {
    const root = this.container;

    root.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      this.isDragging = true;
      this.dragPointerId = e.pointerId;
      this.lastPointerX = e.clientX;
      this.dragDistance = 0;
      this.velocity = 0;
      this.targetTiltX = 0;
      this.targetTiltY = 0;
      root.style.cursor = 'grabbing';
      root.setPointerCapture(e.pointerId);
    });

    root.addEventListener('pointermove', (e) => {
      if (!this.isDragging || e.pointerId !== this.dragPointerId) return;
      const deltaX = e.clientX - this.lastPointerX;
      this.lastPointerX = e.clientX;
      this.dragDistance += Math.abs(deltaX);

      // Direct 1:1 drag with velocity capture
      this.scrollOffset += deltaX;
      this.velocity = deltaX * 60;
    });

    const endDrag = (e) => {
      if (!this.isDragging || e.pointerId !== this.dragPointerId) return;
      this.isDragging = false;
      root.style.cursor = 'grab';
    };

    root.addEventListener('pointerup', endDrag);
    root.addEventListener('pointercancel', endDrag);

    // Inspection click
    root.addEventListener('click', (e) => {
      if (this.dragDistance > 8) return;
      const card = e.target.closest('[data-index]');
      if (!card) return;
      const index = Number(card.getAttribute('data-index'));
      const item = this.items[index];
      if (item) {
        this.onItemClick?.(item, index);
      }
    });
  }

  updateCaption(index) {
    if (!this.caption) return;
    const item = this.items[index];
    if (!item) return;

    const nameEl = this.caption.querySelector('.curved-cap-name');
    const subEl = this.caption.querySelector('.curved-cap-sub');
    const countEl = this.caption.querySelector('.curved-count-current');

    if (nameEl) nameEl.textContent = item.name;
    if (subEl) subEl.textContent = item.title;
    if (countEl) countEl.textContent = String(index + 1).padStart(2, '0');
  }

  renderLoop(now) {
    this.rafId = requestAnimationFrame(this.renderLoop);
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    const count = this.items.length;
    if (count === 0) return;

    const PITCH = this.options.pitch;
    const LOOP_SPAN = Math.max(12, count) * PITCH;

    // Silky Smooth Deceleration & Acceleration
    const isHoverActive = this.options.pauseOnHover && this.hoveredIndex !== null;
    const targetCruise = (isHoverActive && !this.isDragging) ? 0 : -this.options.autoSpeed;

    this.currentCruiseSpeed += (targetCruise - this.currentCruiseSpeed) * (1 - Math.exp(-dt * 6.5));

    if (!this.isDragging) {
      // 95% momentum velocity decay
      this.velocity *= Math.pow(1 - this.options.velocityDecay, dt);
      if (Math.abs(this.velocity) < 0.5) this.velocity = 0;

      this.scrollOffset += (this.currentCruiseSpeed * dt) + (this.velocity * dt);
    }

    // Smooth spring lerp for interactive 3D card tilt
    this.tiltX += (this.targetTiltX - this.tiltX) * (1 - Math.exp(-dt * 14));
    this.tiltY += (this.targetTiltY - this.tiltY) * (1 - Math.exp(-dt * 14));

    // Seamless loop wrapping
    this.scrollOffset = ((this.scrollOffset % LOOP_SPAN) + LOOP_SPAN) % LOOP_SPAN;

    const width = this.container.clientWidth || 1000;
    const height = this.container.clientHeight || 520;
    const centerX = width / 2;
    const centerY = height / 2 - 28;
    const halfSpan = Math.max(380, centerX * 0.88);

    let closestDist = Infinity;
    let closestIndex = 0;

    const cardW = this.options.cardWidth;
    const cardH = this.options.cardHeight;

    // Render cards on 3D inward-curved cylinder
    for (let i = 0; i < count; i++) {
      const card = this.cardElements[i];
      if (!card) continue;

      // Position offset t from center
      let t = ((i * PITCH + this.scrollOffset) % LOOP_SPAN);
      if (t > LOOP_SPAN / 2) t -= LOOP_SPAN;
      if (t < -LOOP_SPAN / 2) t += LOOP_SPAN;

      // Reelmark outward push curve
      const normT = t / halfSpan;
      const x = centerX + t * (1 + 0.083 * normT * normT);

      // Distance from center
      const d = Math.abs(x - centerX) / halfSpan;

      if (d < closestDist) {
        closestDist = d;
        closestIndex = i;
      }

      // Base vertical curve
      const baseY = centerY - 12 * d * d;

      // Base cylinder inward tilt
      const baseRotY = -normT * 25;

      // Z-depth curve (outer cards recede into space)
      const baseZ = -Math.abs(normT) * 115;

      // Base scale
      const baseScale = 1 + 0.08 * Math.pow(Math.min(1.4, d), 2);

      // Smooth per-card hover interpolation (spring lerp)
      const isCardHovered = (this.hoveredIndex === i && !this.isDragging);
      const targetHover = isCardHovered ? 1 : 0;
      this.hoverProgress[i] = this.hoverProgress[i] || 0;
      this.hoverProgress[i] += (targetHover - this.hoverProgress[i]) * (1 - Math.exp(-dt * 12));
      const hov = this.hoverProgress[i];

      // Dynamic 3D Hover Levitation + Mouse Tilt
      const liftZ = hov * 54; // Lifts +54px closer to viewer
      const liftY = hov * 10; // Floats up 10px
      const liftScale = 1 + hov * 0.07; // Expands 7%

      const finalZ = baseZ + liftZ;
      const finalY = baseY - liftY;
      const finalScale = baseScale * liftScale;

      const activeTiltX = isCardHovered ? this.tiltX : 0;
      const activeTiltY = isCardHovered ? this.tiltY : 0;

      const leftPx = x - (cardW / 2);
      const topPx = finalY - (cardH / 2);

      // Smooth opacity fade (zero edge cut-off)
      const opacity = d > 0.82 ? Math.max(0, 1 - (d - 0.82) / 0.36) : 1;

      card.style.transform = `translate3d(${leftPx.toFixed(1)}px, ${topPx.toFixed(1)}px, ${finalZ.toFixed(1)}px) rotateX(${activeTiltX.toFixed(2)}deg) rotateY(${(baseRotY + activeTiltY).toFixed(2)}deg) scale(${finalScale.toFixed(3)})`;
      card.style.opacity = opacity.toFixed(3);

      // Z-index priority: hovered card dominates, then center cards
      card.style.zIndex = isCardHovered ? 250 : Math.round(100 - d * 35);

      // Specular sheen tracking
      if (isCardHovered) {
        const shineEl = card.querySelector('.curved-card-shine');
        if (shineEl) {
          shineEl.style.background = `radial-gradient(circle at ${this.shineX.toFixed(1)}% ${this.shineY.toFixed(1)}%, rgba(254, 240, 138, 0.28) 0%, rgba(255, 255, 255, 0.08) 35%, transparent 65%)`;
        }
      }

      // Toggle hover class for CSS glow effects
      if (hov > 0.05) {
        card.classList.add('is-hovered');
      } else {
        card.classList.remove('is-hovered');
      }
    }

    // Update active caption
    if (closestIndex !== this.activeIndex) {
      this.activeIndex = closestIndex;
      this.updateCaption(closestIndex);
      this.onChange?.(closestIndex);
    }
  }

  destroy() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.container.innerHTML = '';
  }
}
