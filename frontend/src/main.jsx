import React from 'react';
import ReactDOM from 'react-dom/client';
import './i18n';
import './index.css';
import './styles/rtl.css';
import { initColorTheme } from './utils/applyColorTheme';
import { initThemeMode } from './utils/applyThemeMode';
import App from './App';

initThemeMode();
initColorTheme();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
