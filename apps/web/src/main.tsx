import { createRoot } from 'react-dom/client';
import { App } from './App';
import './ui/ui.css';

// Note: no <StrictMode> — its dev-only double-mount would create/destroy the
// Phaser.Game twice, which is wasteful and flickers. The app has no effects that
// benefit from the double-invoke check.
createRoot(document.getElementById('root')!).render(<App />);
