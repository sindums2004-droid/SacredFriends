/**
 * Sacred Friends — 16:9 Cinematic 3D Motion Video Engine
 * Transforms flat character artwork into a living, multi-plane 3D camera experience
 * UMD Universal Module Definition (Works in Browser Script Tags, AMD, CommonJS, ES Modules)
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CinematicMotionEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  class CinematicMotionEngine {
    constructor(canvas, options = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.width = options.width || 1920;
      this.height = options.height || 1080;
      this.options = Object.assign({
        autoStart: true,
        isBackground: false,
        sceneDuration: options.isBackground ? 6.5 : 5.0,
        transitionDuration: 1.5,
        showCharacters: true,
        maxOpacity: options.isBackground ? 0.85 : 1.0
      }, options);

      this.canvas.width = this.width;
      this.canvas.height = this.height;

      // All 15 Sacred Friends Mythology Companions
      this.scenes = [
        {
          id: 'durga',
          name: 'Goddess Durga Maa',
          imageSrc: '/assets/characters/portraits/durga.png',
          bgGradient: ['#1c0409', '#380a15', '#080103'],
          auraColor: 'rgba(235, 120, 40, ',
          accentColor: 'rgba(255, 215, 0, ',
          cameraMotion: {
            startZoom: 1.0,
            endZoom: 1.18,
            startX: -40,
            endX: 35,
            startY: 20,
            endY: -25,
            startRot: -0.015,
            endRot: 0.015
          },
          particleType: 'gold_embers',
          godrayAngle: 0.75,
          godraySpeed: 0.08
        },
        {
          id: 'ganesha',
          name: 'Lord Ganesha',
          imageSrc: '/assets/characters/portraits/ganesha.png',
          bgGradient: ['#221004', '#441d08', '#0a0401'],
          auraColor: 'rgba(255, 170, 30, ',
          accentColor: 'rgba(255, 230, 120, ',
          cameraMotion: {
            startZoom: 1.05,
            endZoom: 1.22,
            startX: 50,
            endX: -30,
            startY: -15,
            endY: 20,
            startRot: 0.02,
            endRot: -0.01
          },
          particleType: 'gold_embers',
          godrayAngle: -0.6,
          godraySpeed: 0.06
        },
        {
          id: 'krishna',
          name: 'Little Krishna',
          imageSrc: '/assets/characters/portraits/krishna.png',
          bgGradient: ['#041224', '#092548', '#01050d'],
          auraColor: 'rgba(56, 189, 248, ',
          accentColor: 'rgba(254, 240, 138, ',
          cameraMotion: {
            startZoom: 1.0,
            endZoom: 1.16,
            startX: -30,
            endX: 40,
            startY: -25,
            endY: 15,
            startRot: -0.018,
            endRot: 0.012
          },
          particleType: 'lotus_petals',
          godrayAngle: 0.4,
          godraySpeed: 0.1
        },
        {
          id: 'shiva',
          name: 'Lord Shiva',
          imageSrc: '/assets/characters/portraits/shiva.png',
          bgGradient: ['#060814', '#101530', '#020308'],
          auraColor: 'rgba(147, 197, 253, ',
          accentColor: 'rgba(226, 232, 240, ',
          cameraMotion: {
            startZoom: 1.02,
            endZoom: 1.15,
            startX: -50,
            endX: 50,
            startY: 0,
            endY: -10,
            startRot: 0.01,
            endRot: -0.01
          },
          particleType: 'cosmic_dust',
          godrayAngle: -0.8,
          godraySpeed: 0.05
        },
        {
          id: 'hanuman',
          name: 'Lord Hanuman',
          imageSrc: '/assets/characters/portraits/hanuman.png',
          bgGradient: ['#280e04', '#4c1a06', '#0d0401'],
          auraColor: 'rgba(249, 115, 22, ',
          accentColor: 'rgba(253, 224, 71, ',
          cameraMotion: {
            startZoom: 1.0,
            endZoom: 1.2,
            startX: 35,
            endX: -35,
            startY: 30,
            endY: -30,
            startRot: -0.015,
            endRot: 0.02
          },
          particleType: 'gold_embers',
          godrayAngle: 0.9,
          godraySpeed: 0.12
        },
        {
          id: 'saraswati',
          name: 'Saraswati Devi',
          imageSrc: '/assets/characters/portraits/saraswati.png',
          bgGradient: ['#08161e', '#133040', '#02070a'],
          auraColor: 'rgba(186, 230, 253, ',
          accentColor: 'rgba(255, 255, 255, ',
          cameraMotion: {
            startZoom: 1.04,
            endZoom: 1.16,
            startX: -40,
            endX: 30,
            startY: -20,
            endY: 15,
            startRot: 0.02,
            endRot: -0.015
          },
          particleType: 'lotus_petals',
          godrayAngle: -0.5,
          godraySpeed: 0.07
        },
        {
          id: 'lakshmi',
          name: 'Lakshmi Devi',
          imageSrc: '/assets/characters/portraits/lakshmi.png',
          bgGradient: ['#220d15', '#451528', '#0a0306'],
          auraColor: 'rgba(250, 204, 21, ',
          accentColor: 'rgba(254, 240, 138, ',
          cameraMotion: {
            startZoom: 1.0,
            endZoom: 1.18,
            startX: 30,
            endX: -40,
            startY: -15,
            endY: 25,
            startRot: -0.012,
            endRot: 0.018
          },
          particleType: 'gold_embers',
          godrayAngle: 0.65,
          godraySpeed: 0.08
        },
        {
          id: 'rama',
          name: 'Lord Rama',
          imageSrc: '/assets/characters/portraits/rama.png',
          bgGradient: ['#1c0c06', '#3b180a', '#080301'],
          auraColor: 'rgba(251, 191, 36, ',
          accentColor: 'rgba(254, 243, 199, ',
          cameraMotion: {
            startZoom: 1.02,
            endZoom: 1.16,
            startX: -35,
            endX: 35,
            startY: 15,
            endY: -20,
            startRot: 0.015,
            endRot: -0.015
          },
          particleType: 'cosmic_dust',
          godrayAngle: -0.7,
          godraySpeed: 0.07
        },
        {
          id: 'kartikeya',
          name: 'Lord Kartikeya',
          imageSrc: '/assets/characters/portraits/kartikeya.png',
          bgGradient: ['#071626', '#143354', '#020912'],
          auraColor: 'rgba(56, 189, 248, ',
          accentColor: 'rgba(251, 146, 60, ',
          cameraMotion: {
            startZoom: 1.0,
            endZoom: 1.17,
            startX: 35,
            endX: -25,
            startY: 20,
            endY: -15,
            startRot: -0.014,
            endRot: 0.016
          },
          particleType: 'gold_embers',
          godrayAngle: 0.5,
          godraySpeed: 0.09
        },
        {
          id: 'ayyappa',
          name: 'Swami Ayyappa',
          imageSrc: '/assets/characters/portraits/ayyappa.png',
          bgGradient: ['#181005', '#33200a', '#060401'],
          auraColor: 'rgba(245, 158, 11, ',
          accentColor: 'rgba(253, 230, 138, ',
          cameraMotion: {
            startZoom: 1.03,
            endZoom: 1.18,
            startX: -30,
            endX: 30,
            startY: -10,
            endY: 15,
            startRot: 0.01,
            endRot: -0.01
          },
          particleType: 'cosmic_dust',
          godrayAngle: -0.4,
          godraySpeed: 0.06
        },
        {
          id: 'parvati',
          name: 'Goddess Parvati',
          imageSrc: '/assets/characters/portraits/parvati.png',
          bgGradient: ['#1e0a12', '#3d1424', '#080205'],
          auraColor: 'rgba(244, 114, 182, ',
          accentColor: 'rgba(254, 215, 170, ',
          cameraMotion: {
            startZoom: 1.0,
            endZoom: 1.15,
            startX: -25,
            endX: 35,
            startY: 15,
            endY: -20,
            startRot: -0.01,
            endRot: 0.01
          },
          particleType: 'lotus_petals',
          godrayAngle: 0.6,
          godraySpeed: 0.07
        },
        {
          id: 'radha',
          name: 'Radha Rani',
          imageSrc: '/assets/characters/portraits/radha.png',
          bgGradient: ['#1d0818', '#3b1130', '#070206'],
          auraColor: 'rgba(232, 121, 249, ',
          accentColor: 'rgba(254, 240, 138, ',
          cameraMotion: {
            startZoom: 1.02,
            endZoom: 1.19,
            startX: 40,
            endX: -30,
            startY: -15,
            endY: 20,
            startRot: 0.015,
            endRot: -0.012
          },
          particleType: 'lotus_petals',
          godrayAngle: -0.55,
          godraySpeed: 0.08
        },
        {
          id: 'sita',
          name: 'Sita Devi',
          imageSrc: '/assets/characters/portraits/sita.png',
          bgGradient: ['#1c1005', '#38200a', '#070401'],
          auraColor: 'rgba(251, 191, 36, ',
          accentColor: 'rgba(254, 243, 199, ',
          cameraMotion: {
            startZoom: 1.0,
            endZoom: 1.16,
            startX: -35,
            endX: 35,
            startY: 20,
            endY: -15,
            startRot: -0.012,
            endRot: 0.015
          },
          particleType: 'lotus_petals',
          godrayAngle: 0.45,
          godraySpeed: 0.07
        },
        {
          id: 'venkateswara',
          name: 'Lord Venkateswara',
          imageSrc: '/assets/characters/portraits/venkateswara.png',
          bgGradient: ['#140722', '#2a0e44', '#05010a'],
          auraColor: 'rgba(192, 132, 252, ',
          accentColor: 'rgba(254, 240, 138, ',
          cameraMotion: {
            startZoom: 1.04,
            endZoom: 1.2,
            startX: -40,
            endX: 40,
            startY: 10,
            endY: -15,
            startRot: 0.015,
            endRot: -0.015
          },
          particleType: 'gold_embers',
          godrayAngle: -0.75,
          godraySpeed: 0.06
        },
        {
          id: 'narasimha',
          name: 'Lord Narasimha',
          imageSrc: '/assets/characters/portraits/narasimha.png',
          bgGradient: ['#250804', '#481008', '#0c0201'],
          auraColor: 'rgba(239, 68, 68, ',
          accentColor: 'rgba(253, 224, 71, ',
          cameraMotion: {
            startZoom: 1.06,
            endZoom: 1.22,
            startX: 35,
            endX: -35,
            startY: -20,
            endY: 25,
            startRot: -0.02,
            endRot: 0.02
          },
          particleType: 'gold_embers',
          godrayAngle: 0.8,
          godraySpeed: 0.11
        }
      ];

      // Preloaded image assets
      this.images = {};
      this.imagesLoaded = false;

      // Timing state
      this.sceneDuration = this.options.sceneDuration;
      this.transitionDuration = this.options.transitionDuration;
      this.currentTime = 0;
      this.lastFrameTime = performance.now();
      this.isRunning = false;
      this.animationFrameId = null;

      // Particles system
      this.particles = [];
      this.initParticles();

      // MediaRecorder state
      this.mediaRecorder = null;
      this.recordedChunks = [];
      this.isRecording = false;

      // Preload all character images
      this.preloadImages();
    }

    preloadImages() {
      let loadedCount = 0;
      const total = this.scenes.length;

      this.scenes.forEach((scene) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          loadedCount++;
          this.images[scene.id] = img;
          if (loadedCount === total) {
            this.imagesLoaded = true;
            console.log('[CinematicEngine] All 15 character assets preloaded successfully.');
            if (this.options.autoStart) {
              this.start();
            }
          }
        };
        img.onerror = () => {
          console.warn(`[CinematicEngine] Failed to load ${scene.imageSrc}`);
        };
        img.src = scene.imageSrc;
      });
    }

    initParticles() {
      this.particles = [];
      const count = this.options.isBackground ? 75 : 100;
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          z: Math.random() * 200 - 50,
          size: Math.random() * 4 + 1.5,
          speedX: (Math.random() - 0.5) * 0.8,
          speedY: (Math.random() * -0.9) - 0.3,
          alpha: Math.random() * 0.6 + 0.2,
          pulseSpeed: Math.random() * 0.03 + 0.01,
          angle: Math.random() * Math.PI * 2,
          wobble: Math.random() * 0.02
        });
      }
    }

    start() {
      if (this.isRunning) return;
      this.isRunning = true;
      this.lastFrameTime = performance.now();
      this.loop();
    }

    stop() {
      this.isRunning = false;
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
    }

    loop() {
      if (!this.isRunning) return;

      const now = performance.now();
      const dt = Math.min((now - this.lastFrameTime) / 1000, 0.1);
      this.lastFrameTime = now;

      this.currentTime += dt;
      this.render();

      this.animationFrameId = requestAnimationFrame(() => this.loop());
    }

    easeInOut(t) {
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    render() {
      const ctx = this.ctx;
      const totalScenes = this.scenes.length;
      const totalLoopDuration = totalScenes * this.sceneDuration;
      const loopTime = this.currentTime % totalLoopDuration;

      const currentSceneIndex = Math.floor(loopTime / this.sceneDuration);
      const nextSceneIndex = (currentSceneIndex + 1) % totalScenes;
      const sceneProgress = (loopTime % this.sceneDuration) / this.sceneDuration;

      const currentScene = this.scenes[currentSceneIndex];
      const nextScene = this.scenes[nextSceneIndex];

      const transitionStartTime = 1 - (this.transitionDuration / this.sceneDuration);
      const isInTransition = sceneProgress >= transitionStartTime;
      let transitionProgress = 0;
      if (isInTransition) {
        transitionProgress = (sceneProgress - transitionStartTime) / (this.transitionDuration / this.sceneDuration);
      }

      ctx.clearRect(0, 0, this.width, this.height);

      // 1. Layer 0 & 1: Background & Volumetric Light
      this.drawBackground(currentScene, nextScene, transitionProgress, isInTransition);

      // 2. Layer 2: Main Character Plane
      const currentAlpha = isInTransition ? 1 - this.easeInOut(transitionProgress) : 1;
      this.drawSceneVisual(currentScene, sceneProgress, currentAlpha, false);

      // 3. Next Scene Cross-Dissolve during Transition
      if (isInTransition && transitionProgress > 0) {
        const nextAlpha = this.easeInOut(transitionProgress);
        this.drawSceneVisual(nextScene, transitionProgress * 0.25, nextAlpha, true);
      }

      // 4. Layer 3: Foreground 3D Floating Particles & Bokeh
      this.drawForegroundParticles(currentScene, sceneProgress);

      // 5. Layer 4: Cinematic Vignette
      this.drawCinematicVignette();
    }

    drawBackground(current, next, transitionT, inTransition) {
      const ctx = this.ctx;
      const cx = this.width / 2;
      const cy = this.height / 2;

      const grad = ctx.createRadialGradient(cx, cy, 50, cx, cy, this.width * 0.75);
      grad.addColorStop(0, current.bgGradient[1]);
      grad.addColorStop(0.55, current.bgGradient[0]);
      grad.addColorStop(1, current.bgGradient[2]);

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.width, this.height);

      if (inTransition && transitionT > 0) {
        const nextGrad = ctx.createRadialGradient(cx, cy, 50, cx, cy, this.width * 0.75);
        nextGrad.addColorStop(0, next.bgGradient[1]);
        nextGrad.addColorStop(0.55, next.bgGradient[0]);
        nextGrad.addColorStop(1, next.bgGradient[2]);

        ctx.save();
        ctx.globalAlpha = this.easeInOut(transitionT);
        ctx.fillStyle = nextGrad;
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.restore();
      }

      this.drawGodrays(current, inTransition ? 1 - transitionT : 1);
    }

    drawGodrays(scene, alpha) {
      const ctx = this.ctx;
      const rayCount = 14;
      const time = this.currentTime * scene.godraySpeed;

      ctx.save();
      ctx.globalAlpha = 0.08 * alpha;
      ctx.globalCompositeOperation = 'screen';

      const originX = this.width * (0.5 + Math.sin(scene.godrayAngle) * 0.3);
      const originY = -100;

      for (let i = 0; i < rayCount; i++) {
        const angle = (i / rayCount) * Math.PI * 0.8 + Math.sin(time + i * 0.4) * 0.08;
        const length = this.height * 1.6;

        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(originX + Math.cos(angle - 0.04) * length, originY + Math.sin(angle - 0.04) * length);
        ctx.lineTo(originX + Math.cos(angle + 0.04) * length, originY + Math.sin(angle + 0.04) * length);
        ctx.closePath();

        const rayGrad = ctx.createRadialGradient(originX, originY, 50, originX, originY, length);
        rayGrad.addColorStop(0, `${scene.accentColor}0.4)`);
        rayGrad.addColorStop(0.6, `${scene.auraColor}0.15)`);
        rayGrad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = rayGrad;
        ctx.fill();
      }

      ctx.restore();
    }

    drawSceneVisual(scene, progress, alpha, isEntering) {
      if (alpha <= 0.001) return;

      const ctx = this.ctx;
      const img = this.images[scene.id];
      if (!img) return;

      const m = scene.cameraMotion;
      const t = this.easeInOut(progress);

      const zoom = isEntering ? (m.startZoom * 0.94 + (m.endZoom - m.startZoom) * t) : (m.startZoom + (m.endZoom - m.startZoom) * t);
      const camX = m.startX + (m.endX - m.startX) * t;
      const camY = m.startY + (m.endY - m.startY) * t;
      const camRot = m.startRot + (m.endRot - m.startRot) * t;

      const breath = Math.sin(this.currentTime * 1.8) * 0.008;

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

      const cx = this.width / 2;
      const cy = this.height / 2;

      ctx.translate(cx + camX, cy + camY);
      ctx.rotate(camRot);
      ctx.scale(zoom + breath, zoom + breath);

      // Divine Halo
      this.drawDivineHalo(scene, 0, -20);

      // Contact Ground Shadow
      this.drawCharacterShadow(0, 310);

      // Character Image (Preserve authentic proportions and identity)
      const charHeight = 640;
      const charWidth = (img.width / img.height) * charHeight;
      const drawX = -charWidth / 2;
      const drawY = -charHeight / 2 - 20;

      ctx.drawImage(img, drawX, drawY, charWidth, charHeight);

      // Subtle Rim Lighting
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = 0.18 * alpha;
      ctx.drawImage(img, drawX, drawY, charWidth, charHeight);
      ctx.restore();

      ctx.restore();
    }

    drawDivineHalo(scene, x, y) {
      const ctx = this.ctx;
      const radius = 340;
      const pulse = Math.sin(this.currentTime * 2.2) * 20;

      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      const haloGrad = ctx.createRadialGradient(x, y, 40, x, y, radius + pulse);
      haloGrad.addColorStop(0, `${scene.auraColor}0.45)`);
      haloGrad.addColorStop(0.45, `${scene.accentColor}0.25)`);
      haloGrad.addColorStop(0.75, `${scene.auraColor}0.08)`);
      haloGrad.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(x, y, radius + pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    drawCharacterShadow(x, y) {
      const ctx = this.ctx;
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(x, y, 220, 45, 0, 0, Math.PI * 2);
      const shadowGrad = ctx.createRadialGradient(x, y, 10, x, y, 220);
      shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
      shadowGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.35)');
      shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = shadowGrad;
      ctx.fill();
      ctx.restore();
    }

    drawForegroundParticles(scene, sceneProgress) {
      const ctx = this.ctx;
      ctx.save();

      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];

        p.x += p.speedX;
        p.y += p.speedY;
        p.angle += p.pulseSpeed;

        if (p.y < -30) {
          p.y = this.height + 30;
          p.x = Math.random() * this.width;
        }
        if (p.x < -30) p.x = this.width + 30;
        if (p.x > this.width + 30) p.x = -30;

        const depthScale = (p.z + 100) / 200;
        const renderSize = p.size * depthScale;
        const alphaPulse = p.alpha + Math.sin(p.angle) * 0.15;
        const safeAlpha = Math.max(0.1, Math.min(0.85, alphaPulse));

        ctx.beginPath();

        if (scene.particleType === 'lotus_petals') {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle);
          ctx.ellipse(0, 0, renderSize * 2, renderSize, 0, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(251, 146, 60, ${safeAlpha * 0.8})`;
          ctx.shadowBlur = 8;
          ctx.shadowColor = 'rgba(251, 146, 60, 0.6)';
          ctx.fill();
          ctx.restore();
        } else {
          ctx.arc(p.x, p.y, renderSize, 0, Math.PI * 2);
          ctx.fillStyle = `${scene.accentColor}${safeAlpha})`;
          ctx.shadowBlur = renderSize * 3;
          ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
          ctx.fill();
        }
      }

      ctx.restore();
    }

    drawCinematicVignette() {
      const ctx = this.ctx;
      const cx = this.width / 2;
      const cy = this.height / 2;

      ctx.save();
      const vigGrad = ctx.createRadialGradient(cx, cy, this.width * 0.4, cx, cy, this.width * 0.78);
      vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vigGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.35)');
      vigGrad.addColorStop(1, 'rgba(0, 0, 0, 0.85)');

      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, this.width, this.height);

      ctx.restore();
    }

    recordVideo(durationSeconds = 44, onProgress, onComplete) {
      if (this.isRecording) return;
      this.isRecording = true;
      this.recordedChunks = [];

      const stream = this.canvas.captureStream(60);

      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 8000000
      });

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      const startTime = performance.now();
      const interval = setInterval(() => {
        const elapsed = (performance.now() - startTime) / 1000;
        const progress = Math.min(1, elapsed / durationSeconds);
        if (onProgress) onProgress(progress, elapsed);

        if (elapsed >= durationSeconds) {
          clearInterval(interval);
          this.stopRecording(onComplete);
        }
      }, 250);

      this.mediaRecorder.start(200);
      console.log(`[CinematicEngine] Recording started (${durationSeconds}s @ 60 FPS)...`);
    }

    stopRecording(onComplete) {
      if (!this.mediaRecorder || !this.isRecording) return;
      this.isRecording = false;

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        console.log(`[CinematicEngine] Recording finished. Blob size: ${(blob.size / (1024 * 1024)).toFixed(2)} MB`);

        if (typeof document !== 'undefined' && !window.__isHeadless) {
          const a = document.createElement('a');
          a.href = url;
          a.download = 'SacredFriends-Cinematic-3D-Motion.webm';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }

        if (onComplete) onComplete(url, blob);
      };

      this.mediaRecorder.stop();
    }
  }

  return CinematicMotionEngine;
}));
