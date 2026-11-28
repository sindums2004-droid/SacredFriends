import React, { useState, useEffect, useRef, useMemo } from 'react';
import { charactersData } from '../../data/characters.js';
import { VanillaCircularCarousel } from './circularCarousel.js';
import { useAudio } from '../../context/AudioContext.jsx';
import './character.css';
import './circularCarousel.css';

/**
 * 3D Interactive Tilt Card Component with Dynamic Surface Glare
 */
const TiltCard = ({ char, isNight, onToggleNight, onPlaySound, onInspect }) => {
  const cardRef = useRef(null);
  const [transform, setTransform] = useState('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });
  const animFrameRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 2 - 1; // -1 to 1
    const py = ((e.clientY - rect.top) / rect.height) * 2 - 1; // -1 to 1

    const rotX = -py * 9; // smooth subtle tilt
    const rotY = px * 11;
    const gx = ((e.clientX - rect.left) / rect.width) * 100;
    const gy = ((e.clientY - rect.top) / rect.height) * 100;

    cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(() => {
      setTransform(`perspective(1000px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) scale3d(1.025, 1.025, 1.025)`);
      setGlare({ x: gx, y: gy, opacity: 0.22 });
    });
  };

  const handleMouseLeave = () => {
    cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(() => {
      setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
      setGlare((prev) => ({ ...prev, opacity: 0 }));
    });
  };

  const displayImg = isNight && char.specialImage ? char.specialImage : char.defaultImage;

  return (
    <div
      ref={cardRef}
      className="pantheon-tilt-card"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={() => onInspect?.(char)}
      style={{ transform }}
    >
      <div
        className="tilt-card-glare"
        style={{
          background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255, 255, 255, 0.22) 0%, transparent 60%)`,
          opacity: glare.opacity
        }}
      />
      <div className="tilt-card-halo" />

      {/* Top Header: Category badge on left, micro-action pills on right */}
      <div className="tilt-card-top-bar">
        <span className="tilt-card-badge">{char.categoryLabel || 'Companion'}</span>
        <div className="tilt-card-micro-actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="tilt-micro-btn"
            onClick={(e) => onToggleNight(char.id, e)}
            title={isNight ? 'Switch to Day Pose' : 'Switch to Night Pose'}
            aria-label="Toggle Pose"
          >
            <span>{isNight ? '☀️' : '🌙'}</span>
          </button>
          <button
            type="button"
            className="tilt-micro-btn"
            onClick={(e) => onPlaySound(char.id, e)}
            title="Play Sacred Melody"
            aria-label="Play Sound"
          >
            <span>🎵</span>
          </button>
        </div>
      </div>

      {/* 3D Center Avatar Artwork */}
      <div className="tilt-card-avatar-wrap">
        <img
          src={displayImg}
          alt={char.name}
          className="tilt-card-img"
          loading="lazy"
          draggable="false"
        />
      </div>

      {/* Bottom Info: Clean Name & Title */}
      <div className="tilt-card-info">
        <h3 className="tilt-card-name">{char.name}</h3>
        <p className="tilt-card-sub">{char.title}</p>
      </div>
    </div>
  );
};

export const Character = ({ onInspectCompanion }) => {
  const [viewMode, setViewMode] = useState('carousel'); // 'carousel' | 'grid'
  const [nightModeMap, setNightModeMap] = useState({}); // { [charId]: boolean }
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  const { playCompanionSound } = useAudio();
  const carouselElRef = useRef(null);
  const carouselInstanceRef = useRef(null);

  const totalPages = Math.ceil(charactersData.length / ITEMS_PER_PAGE);

  const paginatedCharacters = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return charactersData.slice(start, start + ITEMS_PER_PAGE);
  }, [currentPage]);

  // Mount 3D Circular Carousel
  useEffect(() => {
    if (viewMode !== 'carousel' || !carouselElRef.current) return;

    if (!carouselInstanceRef.current) {
      carouselInstanceRef.current = new VanillaCircularCarousel(carouselElRef.current, {
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
          if (item?.id) {
            onInspectCompanion?.(item);
          }
        }
      });
    } else {
      carouselInstanceRef.current.setItems(charactersData);
    }
  }, [viewMode, onInspectCompanion]);

  useEffect(() => {
    return () => {
      if (carouselInstanceRef.current?.destroy) {
        carouselInstanceRef.current.destroy();
        carouselInstanceRef.current = null;
      }
    };
  }, []);

  const toggleDayNight = (charId, e) => {
    e.stopPropagation();
    setNightModeMap((prev) => ({ ...prev, [charId]: !prev[charId] }));
  };

  const handlePlaySound = (charId, e) => {
    e.stopPropagation();
    playCompanionSound(charId);
  };

  return (
    <section className="cinematic-realm realm-pantheon" id="pantheon" aria-label="15 Sacred Friends Pantheon">
      <div className="realm-glow realm-glow-indigo" style={{ top: '10%', right: '5%', width: '600px', height: '600px' }} />
      <div className="realm-vignette-top" />
      <div className="realm-vignette-bottom" />

      <div className="realm-content">
        <div className="pantheon-header-group text-center">
          <div className="realm-tagline-badge">
            <span>The Divine Pantheon</span>
          </div>
          <h2 className="realm-title">
            <span className="gold-shimmer">Meet All 15 Sacred Friends</span>
          </h2>
          <p className="realm-narrative">
            Every companion is rendered with authentic Vedic iconography, sacred attributes, distinct day/night poses, and gentle acoustic sound actions. Explore each divine friend or download your companion today.
          </p>

          {/* Display Mode Switcher (3D Ring Carousel vs Grid) */}
          <div className="pantheon-view-toggle" role="group" aria-label="View Mode">
            <button
              type="button"
              className={`pantheon-mode-btn ${viewMode === 'carousel' ? 'active' : ''}`}
              id="btn-mode-carousel"
              onClick={() => setViewMode('carousel')}
            >
              ✦ 3D Cylindrical Carousel
            </button>
            <button
              type="button"
              className={`pantheon-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
              id="btn-mode-grid"
              onClick={() => setViewMode('grid')}
            >
              ⊞ Interactive 3D Grid
            </button>
          </div>
        </div>

        {/* 3D Circular Carousel Stage */}
        <div
          className="circular-carousel-wrapper"
          id="circular-carousel-wrapper"
          style={{
            width: '100%',
            height: '560px',
            position: 'relative',
            margin: '0.5rem auto 2.5rem',
            display: viewMode === 'carousel' ? 'block' : 'none'
          }}
        >
          <div ref={carouselElRef} id="pantheon-circular-carousel" style={{ width: '100%', height: '100%' }} />
        </div>

        {/* Grand Pantheon Interactive 3D Grid */}
        {viewMode === 'grid' && (
          <div className="pantheon-grid-container">
            <div className="pantheon-grid" id="pantheon-grid" aria-live="polite">
              {paginatedCharacters.map((char) => {
                const isNight = !!nightModeMap[char.id];
                return (
                  <TiltCard
                    key={char.id}
                    char={char}
                    isNight={isNight}
                    onToggleNight={toggleDayNight}
                    onPlaySound={handlePlaySound}
                    onInspect={onInspectCompanion}
                  />
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pantheon-pagination" role="navigation" aria-label="Companions Pagination">
                <button
                  type="button"
                  className="pagination-btn pagination-prev"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous Page"
                >
                  <span aria-hidden="true">←</span> Previous
                </button>

                <div className="pagination-numbers">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      type="button"
                      className={`pagination-num ${currentPage === pageNum ? 'active' : ''}`}
                      onClick={() => setCurrentPage(pageNum)}
                      aria-label={`Go to page ${pageNum}`}
                      aria-current={currentPage === pageNum ? 'page' : undefined}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="pagination-btn pagination-next"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Next Page"
                >
                  Next <span aria-hidden="true">→</span>
                </button>

                <div className="pagination-info">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, charactersData.length)} of {charactersData.length} companions
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
