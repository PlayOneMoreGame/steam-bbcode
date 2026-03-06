import React from 'react';
import ReactDOM from 'react-dom/client';
import posthog from 'posthog-js';
import { App } from './App';

const posthogKey = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
const posthogHost = import.meta.env.VITE_PUBLIC_POSTHOG_HOST;

if (posthogKey) {
  posthog.init(posthogKey, {
    api_host: posthogHost || 'https://us.i.posthog.com',
    autocapture: false,
    capture_pageview: false,
    session_recording: {
      maskAllInputs: false,
    },
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
