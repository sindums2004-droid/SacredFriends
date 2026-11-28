import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext({
  showToast: () => {}
});

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState({ visible: false, message: '' });
  const timerRef = useRef(null);

  const showToast = useCallback((message, duration = 3000) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setToast({ visible: true, message });
    timerRef.current = setTimeout(() => {
      setToast({ visible: false, message: '' });
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, toast }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
