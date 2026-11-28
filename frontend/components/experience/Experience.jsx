import React, { useState, useEffect } from 'react';
import { charactersData } from '../../data/characters.js';
import { useAudio } from '../../context/AudioContext.jsx';
import './experience.css';

const GREETINGS = [
  'Small ideas build big things.',
  'Find stillness amidst the cosmic flow.',
  'Begin with clarity, overcome any hurdle.',
  'Take a deep breath and smile.',
  'Purity of mind and dedicated focus.',
  'Peace in every breath, strength in every step.'
];

export const Experience = () => {
  const [selectedCompanionId, setSelectedCompanionId] = useState('krishna');
  const [greetingIdx, setGreetingIdx] = useState(0);
  const [bubbleScale, setBubbleScale] = useState(1);
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [activeWindow, setActiveWindow] = useState('editor'); // 'editor' | 'browser'
  const { playCompanionSound } = useAudio();

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setDateStr(now.toLocaleDateString([], { month: 'short', day: 'numeric' }));
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentCompanion = charactersData.find((c) => c.id === selectedCompanionId) || charactersData[0];

  const handleSpriteClick = () => {
    const nextIdx = (greetingIdx + 1) % GREETINGS.length;
    setGreetingIdx(nextIdx);
    setBubbleScale(1.08);
    setTimeout(() => setBubbleScale(1), 200);
    playCompanionSound(selectedCompanionId);
  };

  const handleSelectCompanion = (id) => {
    setSelectedCompanionId(id);
    playCompanionSound(id);
  };

  return (
    <section className="realm-journey" id="journey" aria-label="Product Working Experience">
      <div className="experience-container">
        {/* Section Header */}
        <div className="experience-header">
          <div className="experience-category-pill">
            <span className="experience-category-dot" aria-hidden="true" />
            <span>Product in Action</span>
          </div>
          <h2 className="experience-title">
            Live Workspace Companion
          </h2>
          <p className="experience-subtitle">
            See how Sacred Friends operates on your laptop. Your chosen archetype sits quietly
            above the taskbar, offering gentle mindful prompts, timely focus reminders, and 432Hz ambient serenity.
          </p>
        </div>

        {/* Photorealistic Laptop Mockup Showcase */}
        <div className="laptop-showcase-wrapper">
          {/* Laptop Screen / Lid */}
          <div className="laptop-lid">
            {/* Top Bezel with Webcam and Sensor */}
            <div className="laptop-top-bezel">
              <div className="laptop-camera-notch">
                <span className="camera-lens" />
                <span className="camera-indicator" />
              </div>
            </div>

            {/* Inner Screen Display (Live Desktop Simulation) */}
            <div className="laptop-screen-display">
              {/* Desktop Workspace Wallpaper */}
              <div className="desktop-wallpaper">
                {/* Background Ambient Nebula */}
                <div className="desktop-ambient-glow" />

                {/* Simulated IDE / Deep Work Window */}
                <div className="desktop-work-window">
                  <div className="window-titlebar">
                    <div className="window-controls">
                      <span className="win-btn close" />
                      <span className="win-btn min" />
                      <span className="win-btn max" />
                    </div>
                    <span className="window-filename">Workspace — deep_focus.ts</span>
                    <span className="window-status">UTF-8</span>
                  </div>

                  <div className="window-code-content">
                    <p className="code-line"><span className="code-kw">import</span> &#123; <span className="code-fn">createSanctuary</span> &#125; <span className="code-kw">from</span> <span className="code-str">'@sacred-friends/core'</span>;</p>
                    <p className="code-line"><span className="code-cmt">&#47;&#47; Initialize silent desktop companion</span></p>
                    <p className="code-line"><span className="code-kw">const</span> sanctuary = <span className="code-fn">createSanctuary</span>(&#123;</p>
                    <p className="code-line indent"><span className="code-prop">archetype</span>: <span className="code-str">'{currentCompanion.name}'</span>,</p>
                    <p className="code-line indent"><span className="code-prop">frequency</span>: <span className="code-num">432</span>, <span className="code-cmt">&#47;&#47; Hz Harmonic resonance</span></p>
                    <p className="code-line indent"><span className="code-prop">telemetry</span>: <span className="code-kw">false</span>, <span className="code-cmt">&#47;&#47; 100% Offline execution</span></p>
                    <p className="code-line indent"><span className="code-prop">focusMode</span>: <span className="code-str">'infinite_flow'</span></p>
                    <p className="code-line">&#125;);</p>
                    <p className="code-line"><span className="code-kw">await</span> sanctuary.<span className="code-fn">dockToTaskbar</span>(); <span className="code-cmt">&#47;&#47; Status: Active</span></p>
                  </div>
                </div>

                {/* Companion Stage (Rests Gracefully Above Taskbar) */}
                <div className="desktop-companion-stage">
                  {/* Dynamic Speech Bubble */}
                  <div
                    className="desktop-speech-bubble"
                    style={{ transform: `scale(${bubbleScale})` }}
                  >
                    <span className="bubble-quote">“{GREETINGS[greetingIdx]}”</span>
                    <span className="bubble-sub">Click for blessing &bull; 432Hz</span>
                    <div className="bubble-tail" />
                  </div>

                  {/* Clickable Companion Sprite on Taskbar */}
                  <div
                    className="desktop-companion-sprite"
                    onClick={handleSpriteClick}
                    title={`Click ${currentCompanion.name} for a mindful blessing`}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSpriteClick(); }}
                  >
                    <img
                      src={currentCompanion.defaultImage}
                      alt={currentCompanion.name}
                      className="companion-sprite-img"
                    />
                    <div className="companion-pedestal-glow" />
                  </div>
                </div>

                {/* Realistic Centered Windows 11 Taskbar */}
                <div className="desktop-windows-taskbar">
                  <div className="taskbar-center-icons">
                    <div className="taskbar-icon win-logo" title="Start">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#00adef">
                        <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.951-1.801" />
                      </svg>
                    </div>
                    <div className="taskbar-icon" title="Search">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d4d4d8" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    </div>
                    <div className="taskbar-icon" title="Terminal">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d4d4d8" strokeWidth="2">
                        <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
                      </svg>
                    </div>
                    <div className="taskbar-icon active" title="Sacred Friends Active">
                      <img src="/assets/sacred_friends_logo.png" alt="Sacred Friends Tray" className="taskbar-sf-icon" />
                    </div>
                  </div>

                  <div className="taskbar-tray">
                    <span className="tray-stat">&lt; 0.4% CPU</span>
                    <span className="tray-divider">|</span>
                    <span className="tray-clock">{timeStr} &bull; {dateStr}</span>
                  </div>
                </div>
              </div>

              {/* Glass Reflection Gloss Line */}
              <div className="laptop-screen-glare" aria-hidden="true" />
            </div>
          </div>

          {/* Laptop Bottom Chassis / Base Deck */}
          <div className="laptop-base-deck">
            <div className="laptop-notch-lip" />
          </div>

          {/* Ambient Ground Shadow */}
          <div className="laptop-ground-shadow" aria-hidden="true" />
        </div>

        {/* Companion Selector & Feature Highlights Bar */}
        <div className="experience-controls-bar">
          <div className="controls-label">
            <span className="controls-title">Choose Archetype on Screen:</span>
            <span className="controls-hint">Click any deity to see them appear live on the laptop</span>
          </div>

          <div className="companion-switch-pills">
            {charactersData.slice(0, 6).map((c) => (
              <button
                key={c.id}
                type="button"
                className={`companion-pill-btn ${selectedCompanionId === c.id ? 'active' : ''}`}
                onClick={() => handleSelectCompanion(c.id)}
              >
                <img src={c.defaultImage} alt={c.name} className="pill-avatar" />
                <span className="pill-name">{c.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Feature Highlights Row */}
        <div className="product-features-strip">
          <div className="product-feature-box">
            <span className="feature-num">01</span>
            <div className="feature-content">
              <h4 className="feature-title">System Tray Native</h4>
              <p className="feature-desc">Resting quietly in the Windows tray, always ready without cluttering your workflow.</p>
            </div>
          </div>

          <div className="product-feature-box">
            <span className="feature-num">02</span>
            <div className="feature-content">
              <h4 className="feature-title">Interactive Blessings</h4>
              <p className="feature-desc">Click anytime for mindful pauses, wisdom proverbs, and acoustic 432Hz harmonic chimes.</p>
            </div>
          </div>

          <div className="product-feature-box">
            <span className="feature-num">03</span>
            <div className="feature-content">
              <h4 className="feature-title">Ultra-Light Footprint</h4>
              <p className="feature-desc">Consumes under 0.4% CPU and 18MB RAM. 100% offline with zero cloud battery drain.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
