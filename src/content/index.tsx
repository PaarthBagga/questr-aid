/**
 * Content script entry point.
 * Mounts the Questr-aid panel into a Shadow DOM root so our styles are
 * completely isolated from Questrade's own CSS.
 */

import { createRoot } from 'react-dom/client';
import { Panel } from '../ui/Panel';
import panelStyles from '../ui/panel.css?inline';

function mount() {
  // Prevent double-mounting on SPA navigations
  if (document.getElementById('questr-aid-host')) return;

  // Shadow host — sits outside Questrade's DOM tree hierarchy visually
  const host = document.createElement('div');
  host.id = 'questr-aid-host';

  // Fixed positioning applied inline so no style sheet dependency
  Object.assign(host.style, {
    position:  'fixed',
    top:       '80px',
    right:     '16px',
    zIndex:    '2147483647',
    width:     '288px',
    fontFamily: 'inherit',
  });

  document.body.appendChild(host);

  // Attach closed shadow DOM for full style isolation
  const shadow = host.attachShadow({ mode: 'closed' });

  // Inject compiled Tailwind + custom styles
  const style = document.createElement('style');
  style.textContent = panelStyles;
  shadow.appendChild(style);

  // React mount point inside shadow
  const mountPoint = document.createElement('div');
  shadow.appendChild(mountPoint);

  createRoot(mountPoint).render(<Panel />);
}

// Mount immediately if DOM is ready; otherwise wait
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}

// Re-detect on Questrade SPA navigations
let lastUrl = location.href;
const observer = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    // Unmount old panel and remount so the new ticker is detected
    const existing = document.getElementById('questr-aid-host');
    if (existing) existing.remove();
    setTimeout(mount, 500); // brief delay for SPA route to settle
  }
});

observer.observe(document.body, { childList: true, subtree: true });
