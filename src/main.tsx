import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {bootstrap} from './lib/bootstrap';
import {installScrollTabs} from './lib/scrollTabs';
import './index.css';

// One-time app initialization (observability, env validation).
bootstrap();

// Phone tab strips: one row, a fade on the side that continues, the active tab in view.
installScrollTabs();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
