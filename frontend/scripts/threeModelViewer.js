import * as THREE from 'three';

/**
 * Three.js 3D Model & Character Interactive Viewer
 * Features matching React Bits ModelViewer:
 * - Three.js WebGL rendering with transparency
 * - autoRotate, dragRotate with momentum & inertia
 * - hoverTilt tracking cursor
 * - float vertical bobbing
 * - soft contact shadow
 * - interactive zoom
 * - smooth transitions on character switch
 */

export class ThreeModelViewer {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      width: options.width || container.clientWidth || 300,
      height: options.height || container.clientHeight || 300,
      autoRotate: options.autoRotate !== undefined ? options.autoRotate : true,
      autoRotateSpeed: options.autoRotateSpeed || 0.4,
      autoRotateDelay: options.autoRotateDelay || 2,
      dragRotate: options.dragRotate !== undefined ? options.dragRotate : true,
      hoverTilt: options.hoverTilt !== undefined ? options.hoverTilt : 0.2,
      float: options.float !== undefined ? options.float : 0.35,
      zoom: options.zoom !== undefined ? options.zoom : true,
      minZoom: options.minZoom || 0.7,
      maxZoom: options.maxZoom || 1.8,
      shadow: options.shadow !== undefined ? options.shadow : true,
      ...options
    };

    this.motion = {
      yaw: 0,
      pitch: 0,
      yawVelocity: 0,
      pitchVelocity: 0,
      zoom: 1,
      zoomGoal: 1,
      tiltX: 0,
      tiltY: 0,
      tiltGoalX: 0,
      tiltGoalY: 0,
      spinSpeed: 0,
      idle: 0,
      clock: 0,
      dragging: false
    };

    this.init();
  }

  init() {
    const width = this.container.clientWidth || this.options.width;
    const height = this.container.clientHeight || this.options.height;

    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 100);
    this.camera.position.set(0, 0, 5.2);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.cursor = 'grab';
    this.renderer.domElement.style.touchAction = 'none';

    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xfff6dd, 1.4);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffecc0, 1.8);
    dirLight1.position.set(3, 4, 3);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.8);
    dirLight2.position.set(-3, -2, -2);
    this.scene.add(dirLight2);

    // Root Group
    this.rootGroup = new THREE.Group();
    this.scene.add(this.rootGroup);

    // Float group
    this.floatGroup = new THREE.Group();
    this.rootGroup.add(this.floatGroup);

    // Spin group (handles yaw and pitch)
    this.spinGroup = new THREE.Group();
    this.floatGroup.add(this.spinGroup);

    // Particles Aura
    this.createParticles();

    // Contact Shadow
    if (this.options.shadow) {
      this.createShadow();
    }

    // Event listeners
    this.bindEvents();

    // Texture Loader
    this.textureLoader = new THREE.TextureLoader();

    // Start loop
    this.lastTime = performance.now();
    this.animate = this.animate.bind(this);
    this.animId = requestAnimationFrame(this.animate);
  }

  createShadow() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
    grad.addColorStop(0.4, 'rgba(0, 0, 0, 0.35)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    const shadowTex = new THREE.CanvasTexture(canvas);
    const shadowGeo = new THREE.PlaneGeometry(1.6, 1.6);
    const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.6 });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -1.15;
    this.rootGroup.add(shadowMesh);
  }

  createParticles() {
    const count = 35;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.1 + Math.random() * 0.7;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 2;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      scales[i] = Math.random();
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));

    const pMat = new THREE.PointsMaterial({
      color: 0xfef08a,
      size: 0.05,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });

    this.particles = new THREE.Points(geometry, pMat);
    this.floatGroup.add(this.particles);
  }

  loadCharacter(imageUrl) {
    this.textureLoader.load(imageUrl, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.generateMipmaps = true;
      texture.minFilter = THREE.LinearMipmapLinearFilter;

      // Clean existing mesh
      if (this.characterMesh) {
        this.spinGroup.remove(this.characterMesh);
        this.characterMesh.geometry.dispose();
        this.characterMesh.material.dispose();
      }

      // Aspect ratio
      const img = texture.image;
      const aspect = (img.width || 1) / (img.height || 1);
      const height = 2.1;
      const width = height * aspect;

      const geometry = new THREE.PlaneGeometry(width, height, 8, 8);
      const material = new THREE.MeshStandardMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.02,
        roughness: 0.35,
        metalness: 0.15,
        side: THREE.DoubleSide
      });

      this.characterMesh = new THREE.Mesh(geometry, material);
      this.characterMesh.position.y = 0.05;

      // Burst entrance scale
      this.characterMesh.scale.set(0.6, 0.6, 0.6);
      this.spinGroup.add(this.characterMesh);

      // Intro burst
      this.motion.yawVelocity = 2.5;
    });
  }

  bindEvents() {
    const el = this.renderer.domElement;
    let lastX = 0;
    let lastY = 0;
    let lastT = 0;

    const onDown = (e) => {
      if (!this.options.dragRotate) return;
      this.motion.dragging = true;
      this.motion.yawVelocity = 0;
      this.motion.pitchVelocity = 0;
      lastX = e.clientX;
      lastY = e.clientY;
      lastT = performance.now();
      el.setPointerCapture?.(e.pointerId);
      el.style.cursor = 'grabbing';
      this.motion.idle = 0;
    };

    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;

      this.motion.tiltGoalX = ny * this.options.hoverTilt * 0.5;
      this.motion.tiltGoalY = nx * this.options.hoverTilt;

      if (this.motion.dragging) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        const now = performance.now();
        const dt = Math.max((now - lastT) / 1000, 0.005);

        this.motion.yaw += dx * 0.008;
        this.motion.pitch = Math.max(-0.6, Math.min(0.6, this.motion.pitch + dy * 0.006));

        this.motion.yawVelocity = this.motion.yawVelocity * 0.4 + ((dx * 0.008) / dt) * 0.6;
        this.motion.pitchVelocity = this.motion.pitchVelocity * 0.4 + ((dy * 0.006) / dt) * 0.6;

        lastX = e.clientX;
        lastY = e.clientY;
        lastT = now;
        this.motion.idle = 0;
      }
    };

    const onUp = (e) => {
      this.motion.dragging = false;
      el.style.cursor = 'grab';
    };

    const onLeave = () => {
      this.motion.tiltGoalX = 0;
      this.motion.tiltGoalY = 0;
    };

    const onWheel = (e) => {
      if (!this.options.zoom) return;
      e.preventDefault();
      const delta = e.deltaY * -0.0015;
      this.motion.zoomGoal = Math.max(this.options.minZoom, Math.min(this.options.maxZoom, this.motion.zoomGoal + delta));
      this.motion.idle = 0;
    };

    const onDblClick = () => {
      this.motion.yaw = 0;
      this.motion.pitch = 0;
      this.motion.yawVelocity = 0;
      this.motion.pitchVelocity = 0;
      this.motion.zoomGoal = 1;
      this.motion.idle = 0;
    };

    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    el.addEventListener('pointerleave', onLeave);
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('dblclick', onDblClick);

    this.resizeObserver = new ResizeObserver(() => {
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      if (w > 0 && h > 0) {
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
      }
    });
    this.resizeObserver.observe(this.container);
  }

  animate(now) {
    this.animId = requestAnimationFrame(this.animate);

    const delta = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    const m = this.motion;
    m.clock += delta;
    m.idle += delta;

    // Scale mesh intro
    if (this.characterMesh && this.characterMesh.scale.x < 1) {
      const s = Math.min(1, this.characterMesh.scale.x + delta * 2.5);
      this.characterMesh.scale.set(s, s, s);
    }

    // Velocity decay
    if (!m.dragging) {
      const decay = Math.exp(-delta * 4);
      m.yaw += m.yawVelocity * delta;
      m.pitch += m.pitchVelocity * delta;
      m.yawVelocity *= decay;
      m.pitchVelocity *= decay;
      m.pitch *= Math.exp(-delta * 2);
    }

    // Auto rotate
    if (this.options.autoRotate && !m.dragging && m.idle > this.options.autoRotateDelay) {
      m.spinSpeed += (this.options.autoRotateSpeed - m.spinSpeed) * (1 - Math.exp(-delta * 2));
      m.yaw += m.spinSpeed * delta;
    } else {
      m.spinSpeed *= Math.exp(-delta * 3);
    }

    // Zoom easing
    m.zoom += (m.zoomGoal - m.zoom) * (1 - Math.exp(-delta * 7));
    this.camera.position.z = 5.2 / m.zoom;

    // Tilt easing
    m.tiltX += (m.tiltGoalX - m.tiltX) * (1 - Math.exp(-delta * 6));
    m.tiltY += (m.tiltGoalY - m.tiltY) * (1 - Math.exp(-delta * 6));

    // Float vertical bobbing
    const bob = Math.sin(m.clock * 1.6) * this.options.float * 0.08;
    this.floatGroup.position.y = bob;

    // Apply rotations
    this.floatGroup.rotation.set(m.tiltX, m.tiltY, 0);
    this.spinGroup.rotation.set(m.pitch, m.yaw, 0, 'YXZ');

    // Particles slow orbit
    if (this.particles) {
      this.particles.rotation.y = m.clock * 0.15;
    }

    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    cancelAnimationFrame(this.animId);
    this.resizeObserver?.disconnect();
    this.renderer.dispose();
  }
}
