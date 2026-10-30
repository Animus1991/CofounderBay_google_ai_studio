import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {bootstrap} from './lib/bootstrap';
import './index.css';

// One-time app initialization (observability, env validation).
bootstrap();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
