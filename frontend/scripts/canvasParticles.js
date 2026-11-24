/**
 * Procedural Celestial Particle Engine
 * Creates an immersive divine atmosphere using HTML5 Canvas (No video background)
 */

export function initCanvasParticles() {
  const canvas = document.getElementById('celestial-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Check reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const mouse = { x: width / 2, y: height / 2, targetX: width / 2, targetY: height / 2 };

  window.addEventListener('mousemove', (e) => {
    mouse.targetX = e.clientX;
    mouse.targetY = e.clientY;
  });

  const particleCount = prefersReducedMotion ? 15 : Math.min(35, Math.floor((width * height) / 35000));
  const particles = [];

  const colors = [
    'rgba(254, 240, 138, ',  // light gold
    'rgba(212, 175, 55, ',   // base gold
    'rgba(230, 222, 211, ',  // soft cream
    'rgba(245, 158, 11, '    // warm amber
  ];

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.8 + 0.8,
      speedX: (Math.random() - 0.5) * 0.25,
      speedY: (Math.random() * -0.3) - 0.1,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: Math.random() * 0.5 + 0.2,
      pulseSpeed: Math.random() * 0.02 + 0.01,
      angle: Math.random() * Math.PI * 2
    });
  }

  function render() {
    ctx.clearRect(0, 0, width, height);

    // Update and draw lightweight celestial particles (hardware accelerated, zero shadow blur overhead)
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      if (!prefersReducedMotion) {
        p.x += p.speedX;
        p.y += p.speedY;
        p.angle += p.pulseSpeed;

        // Wrap around borders
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
      }

      const currentAlpha = p.alpha + Math.sin(p.angle) * 0.15;
      const safeAlpha = Math.max(0.1, Math.min(0.85, currentAlpha));

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `${p.color}${safeAlpha})`;
      ctx.fill();
    }

    requestAnimationFrame(render);
  }

  render();
}

