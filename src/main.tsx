import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/app.css';
import { safeGetRaw } from './api/storage';

// 첫 페인트 전에 테마를 적용해 깜빡임을 막는다.
document.documentElement.dataset.theme = safeGetRaw('archilaw_theme') === 'dark' ? 'dark' : 'light';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
