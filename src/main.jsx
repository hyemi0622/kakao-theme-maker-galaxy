import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { initViewport } from './lib/viewport.js';

// 카카오톡 인앱 브라우저 배율 튐 방지 — 렌더 전에 먼저 실행
initViewport();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
