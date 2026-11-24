/**
 * Conceptual Desktop Application Presentation Mockup
 * Strictly Illustrative: Demonstrates transparent companion presence on a Windows desktop.
 */
import { charactersData } from '../data/characters.js';

export function initDesktopMockup() {
  const clockEl = document.getElementById('mock-taskbar-clock');
  const dateEl = document.getElementById('mock-taskbar-date');
  const companionImg = document.getElementById('mock-companion-img');
  const bubbleMsg = document.getElementById('mock-bubble-msg');
  const spriteBox = document.getElementById('mock-companion-sprite-box');
  const companionSelector = document.getElementById('mock-companion-select');

  // Update clock in taskbar
  function updateTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    if (clockEl) clockEl.textContent = timeStr;
    if (dateEl) dateEl.textContent = dateStr;
  }
  updateTime();
  setInterval(updateTime, 1000);

  // Companion Greetings list
  const greetings = [
    'Take a deep breath and smile.',
    'Remember to stay hydrated!',
    'Small ideas build big things.',
    'Wishing you peaceful focus.',
    'Great work! Take a gentle stretch.'
  ];
  let greetingIndex = 0;

  if (spriteBox && bubbleMsg) {
    spriteBox.addEventListener('click', () => {
      greetingIndex = (greetingIndex + 1) % greetings.length;
      bubbleMsg.textContent = greetings[greetingIndex];
      bubbleMsg.style.transform = 'scale(1.08)';
      setTimeout(() => {
        bubbleMsg.style.transform = 'scale(1)';
      }, 200);
    });
  }

  // Allow switching companion in the illustrative mockup
  if (companionSelector && companionImg) {
    companionSelector.addEventListener('change', (e) => {
      const selectedId = e.target.value;
      const found = charactersData.find((c) => c.id === selectedId);
      if (found) {
        companionImg.style.opacity = '0';
        setTimeout(() => {
          companionImg.src = found.defaultImage;
          companionImg.alt = `${found.name} Desktop Companion`;
          companionImg.style.opacity = '1';
          if (bubbleMsg) {
            bubbleMsg.textContent = `Hello from ${found.name}!`;
          }
        }, 150);
      }
    });
  }
}

