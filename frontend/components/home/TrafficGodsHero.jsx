import React, { useEffect, useRef, useState, useCallback } from 'react';
import './traffic-gods.css';

export const TrafficGodsHero = ({ onContactClick }) => {
  const trackRef = useRef(null);
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const animFrameRef = useRef(null);
  const scrubFrameRef = useRef(null);
  const targetTimeRef = useRef(0);
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });
  const [scrollHintOpacity, setScrollHintOpacity] = useState(1);
  const [textOpacity, setTextOpacity] = useState(0);

  // 1. Scroll-Driven Eye Awakening Video Engine (High-FPS All-Intra 60fps Pipeline)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Ensure video is paused at frame 0 (eyes peacefully closed)
    video.pause();
    video.currentTime = 0;

    let isSeeking = false;
    let pendingSeekTime = null;
    let smoothTime = 0;

    const performSeek = (time) => {
      if (video.readyState < 2) return;
      if (!isSeeking) {
        isSeeking = true;
        video.currentTime = time;
      } else {
        pendingSeekTime = time;
      }
    };

    const handleSeeked = () => {
      isSeeking = false;
      if (pendingSeekTime !== null) {
        const nextTime = pendingSeekTime;
        pendingSeekTime = null;
        performSeek(nextTime);
      }
    };

    video.addEventListener('seeked', handleSeeked);

    const handleScroll = () => {
      const track = trackRef.current;
      if (!track || !video) return;

      const rect = track.getBoundingClientRect();
      const scrollableDist = rect.height - window.innerHeight;
      const scrolled = -rect.top;
      const progress = Math.max(0, Math.min(1, scrolled / Math.max(1, scrollableDist)));

      // Target seek timestamp (0.0s = eyes closed, ~3.8s = eyes fully open)
      const maxSeek = (video.duration && !isNaN(video.duration)) ? Math.min(4.0, video.duration * 0.90) : 3.8;
      targetTimeRef.current = progress * maxSeek;

      // Fade out scroll prompt as user begins scrolling
      setScrollHintOpacity(Math.max(0, 1 - progress * 4));

      // Text appears in sync as eyes open on scroll (not from starting)
      const tOpacity = Math.max(0, Math.min(1, (progress - 0.06) / 0.44));
      setTextOpacity(tOpacity);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    // Silky-smooth 60fps lerp loop with zero decoder starvation
    const renderScrub = () => {
      const target = targetTimeRef.current;
      const diff = target - smoothTime;

      if (Math.abs(diff) > 0.002) {
        smoothTime += diff * 0.35; // Responsive 60fps interpolation
        performSeek(smoothTime);
      } else if (smoothTime !== target) {
        smoothTime = target;
        performSeek(smoothTime);
      }

      scrubFrameRef.current = requestAnimationFrame(renderScrub);
    };

    scrubFrameRef.current = requestAnimationFrame(renderScrub);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      video.removeEventListener('seeked', handleSeeked);
      if (scrubFrameRef.current) cancelAnimationFrame(scrubFrameRef.current);
    };
  }, []);

  // 2. Realistic Physics-Based Floating Embers Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', handleResize);

    const EMBER_COUNT = 48;
    const embers = Array.from({ length: EMBER_COUNT }, () => ({
      x: Math.random() * width,
      y: height * 0.4 + Math.random() * (height * 0.6),
      size: Math.random() * 2.0 + 0.6,
      speedY: Math.random() * 0.7 + 0.3,
      speedX: (Math.random() - 0.5) * 0.35,
      opacity: Math.random() * 0.7 + 0.3,
      flickerSpeed: Math.random() * 0.04 + 0.015,
      flickerOffset: Math.random() * Math.PI * 2,
      isGold: Math.random() > 0.4
    }));

    let frame = 0;
    const render = () => {
      frame++;
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < embers.length; i++) {
        const e = embers[i];
        e.y -= e.speedY;
        e.x += e.speedX + Math.sin(frame * 0.02 + e.flickerOffset) * 0.25;

        // Reset particle when reaching top
        if (e.y < height * 0.15 || e.x < 0 || e.x > width) {
          e.y = height * 0.85 + Math.random() * (height * 0.15);
          e.x = width * 0.25 + Math.random() * (width * 0.5);
          e.opacity = Math.random() * 0.7 + 0.3;
        }

        const currentOpacity = Math.max(
          0.1,
          e.opacity * (0.7 + 0.3 * Math.sin(frame * e.flickerSpeed + e.flickerOffset))
        );

        ctx.save();
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);

        // Divine Golden Shimmer & Lotus Pollen
        if (e.isGold) {
          ctx.fillStyle = `rgba(235, 185, 75, ${currentOpacity})`;
          ctx.shadowColor = 'rgba(212, 160, 45, 0.85)';
        } else {
          ctx.fillStyle = `rgba(255, 235, 180, ${currentOpacity})`;
          ctx.shadowColor = 'rgba(255, 210, 110, 0.75)';
        }
        ctx.shadowBlur = e.size * 3.5;
        ctx.fill();
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // 3. 3D Spatial Mouse Parallax Tracking
  const handleMouseMove = useCallback((e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const normX = (e.clientX - centerX) / (rect.width / 2);
    const normY = (e.clientY - centerY) / (rect.height / 2);

    setMouseOffset({
      x: Math.max(-1, Math.min(1, normX)),
      y: Math.max(-1, Math.min(1, normY))
    });
  }, []);

  return (
    <div ref={trackRef} className="traffic-gods-scroll-track">
      <section
        ref={containerRef}
        className="traffic-gods-viewport"
        id="opening"
        aria-label="Traffic Gods Experience"
        onMouseMove={handleMouseMove}
      >
        {/* Scroll-Scrubbed Hero Background Video (Eyes Awake On Scroll Down - 60FPS All-Intra) */}
        <video
          ref={videoRef}
          key="hero-video-scrub-60fps"
          className="traffic-gods-hero-video"
          muted
          playsInline
          preload="auto"
        >
          <source src="/hero_video_60fps.mp4?v=60fps_intra" type="video/mp4" />
          <source src="/hero_video.mp4?v=60fps_intra" type="video/mp4" />
          <source src="/hero video.mp4?v=60fps_intra" type="video/mp4" />
        </video>

        {/* Background Volumetric Nebula Fog */}
        <div className="traffic-gods-bg-nebula" aria-hidden="true" />
        <div className="smoke-layer" aria-hidden="true" />
        <div className="smoke-layer-2" aria-hidden="true" />

        {/* Seamless Bottom Vignette Fade into Next Page Section */}
        <div className="traffic-gods-bottom-fade" aria-hidden="true" />

        {/* Floating Realistic Embers Canvas */}
        <canvas ref={canvasRef} className="embers-canvas" aria-hidden="true" />

        {/* 1. HEADER SECTION (Hidden at starting; reveals in sync as eyes open on scroll) */}
        <header
          className={`traffic-gods-header-stack ${textOpacity > 0.05 ? 'revealed' : ''}`}
          style={{
            opacity: textOpacity,
            transform: `translate3d(0, ${(1 - textOpacity) * 20}px, 0)`,
            pointerEvents: textOpacity > 0.5 ? 'auto' : 'none'
          }}
        >
          <div
            className="traffic-gods-title-wrap"
            style={{
              transform: `translate3d(${mouseOffset.x * 6}px, ${mouseOffset.y * 4}px, 0)`
            }}
          >
            <h1 className="traffic-gods-headline">SACRED FRIENDS</h1>
          </div>
        </header>

        {/* Subtle Ambient Scroll Prompt */}
        <div
          className="traffic-gods-scroll-hint"
          style={{ opacity: scrollHintOpacity }}
          aria-hidden="true"
        >
          <span>Scroll to awaken</span>
          <div className="scroll-chevron" />
        </div>
      </section>
    </div>
  );
};
