import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { UnifiedAuthProvider } from './hooks/useUnifiedAuth'

createRoot(document.getElementById("root")!).render(
  <UnifiedAuthProvider>
    <App />
  </UnifiedAuthProvider>
);
