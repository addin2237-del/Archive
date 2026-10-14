import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/app.css';
import { clients } from './api';
import { safeGetRaw } from './api/storage';
import { loadInitialData } from './bootstrap';

// 첫 페인트 전에 테마를 적용해 깜빡임을 막는다.
document.documentElement.dataset.theme = safeGetRaw('archilaw_theme') === 'dark' ? 'dark' : 'light';

loadInitialData(clients).then((initial) => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App initial={initial} />
    </StrictMode>,
  );
});
