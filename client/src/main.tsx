import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/i18n';
import { applyDocumentLang } from '@/i18n';
import App from '@/App';
import '@/index.css';

applyDocumentLang();

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root was not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
