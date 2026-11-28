import React from 'react';
import { useToast } from '../../context/ToastContext.jsx';
import './toast.css';

export const Toast = () => {
  const { toast } = useToast();

  if (!toast.visible) return null;

  return (
    <div id="toast-notice" className="toast-notice visible" role="status" aria-live="polite">
      <span className="toast-sparkle">✦</span>
      <span id="toast-message" className="toast-message">{toast.message}</span>
    </div>
  );
};
