import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// One-time cleanup of legacy localStorage keys and old Service Worker caches
// so previous app data/builds never conflict with the latest version.
const APP_CLEANUP_VERSION = '2026-10-21-v4-clean';
try {
  if (localStorage.getItem('app_cleanup_version') !== APP_CLEANUP_VERSION) {
    const legacyKeys = [
      'fie2002_trend_history',
      'jadwal_overtime_tables',
      'jadwalData',
      'kas_grup_data',
      'kasGrupData',
      'catatan_data',
      'catatanData',
      'demonomerData',
      'siloData',
      'currentView',
      'currentGroup',
    ];
    legacyKeys.forEach((key) => localStorage.removeItem(key));
    localStorage.setItem('app_cleanup_version', APP_CLEANUP_VERSION);

    if ('caches' in window) {
      caches.keys().then((keys) => {
        keys.forEach((key) => {
          if (key !== 'pvc5-pwa-v4-clean') {
            caches.delete(key);
          }
        });
      });
    }
  }
} catch (e) {
  console.warn('Storage cleanup skipped:', e);
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);