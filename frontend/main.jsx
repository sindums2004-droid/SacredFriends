import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.jsx';

// Global Styles & Cinematic Atmosphere
import './styles/tokens.css';
import './styles/main.css';
import './styles/cinematic.css';

const rootElement = document.getElementById('root');

if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error('Failed to locate #root container element in index.html');
}
