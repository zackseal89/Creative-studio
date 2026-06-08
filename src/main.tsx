import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safely suppress benign, expected sandbox WebSocket rejections to prevent error overlays
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  if (
    reason && 
    (reason.message === 'WebSocket closed without opened.' || 
     (typeof reason === 'string' && reason.includes('WebSocket')) ||
     (reason.message && reason.message.includes('WebSocket')))
  ) {
    event.preventDefault();
    console.warn("Gracefully bypassed benign sandbox WebSocket redirection.");
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

