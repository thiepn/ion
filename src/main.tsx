import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

// Do not import the race engine, Three.js or the course before the UI shell.
// The complete App is fetched separately, followed by the optional 3D stage.
const App = lazy(() => import('./App').then(module => ({ default: module.App })));

const host = document.getElementById('root');
if (!host) throw new Error('ION root element missing');

createRoot(host).render(
  <StrictMode>
    <Suspense fallback={
      <main className="boot-shell" role="status" aria-live="polite">
        <div className="boot-identity">I<span>O</span>N</div>
        <p>ANTI-GRAVITY RACING SYSTEM</p>
        <div className="boot-rule" aria-hidden="true"/>
        <strong>INITIALIZING PILOT SYSTEM</strong>
      </main>
    }>
      <App />
    </Suspense>
  </StrictMode>
);
