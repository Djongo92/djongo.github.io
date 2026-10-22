import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';

import './index.css';

// `?reset=1` on any URL returns the demo to a first visit: forgets language,
// theme, and finished tours (the rest of the demo state is in memory only).
const params = new URLSearchParams(window.location.search);
if (params.has('reset')) {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('amcham_') || k === 'theme')
      .forEach((k) => localStorage.removeItem(k));
    sessionStorage.removeItem('amcham_lang');
  } catch {
    // Storage can be unavailable (private mode); a reload is still a reset.
  }
  params.delete('reset');
  const query = params.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
}

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
