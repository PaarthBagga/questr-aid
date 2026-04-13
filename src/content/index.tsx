/**
 * Content script entry point.
 * Mounts the Questr-aid panel into a Shadow DOM root so our styles are
 * completely isolated from Questrade's own CSS.
 */

import { createRoot } from 'react-dom/client';
import { Panel } from '../ui/Panel';
import panelStyles from '../ui/panel.css?inline';

/** ms to wait after a URL change before remounting — lets the SPA route settle */
const SPA_SETTLE_MS = 600;

/** ms between URL polls for SPA navigation detection (lighter than MutationObserver) */
const URL_POLL_MS = 750;

function getHost(): HTMLElement | null {
  return document.getElementById('questr-aid-host') as HTMLElement | null;
}

function mount(tickerOverride?: string): void {
  if (getHost()) return; // already mounted

  const host = document.createElement('div');
  host.id = 'questr-aid-host';

  // Stash manual ticker so detect() can read it without module-level shared state
  if (tickerOverride) {
    host.dataset.manualTicker = tickerOverride;
  }

  Object.assign(host.style, {
    position:  'fixed',
    top:       '80px',
    right:     '16px',
    zIndex:    '999999',
    width:     '288px',
  });

  document.body.appendChild(host);

  // Attach closed shadow DOM for full style isolation from Questrade's CSS
  const shadow = host.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = panelStyles;
  shadow.appendChild(style);

  const mountPoint = document.createElement('div');
  shadow.appendChild(mountPoint);

  createRoot(mountPoint).render(<Panel />);
}

function remount(tickerOverride?: string): void {
  getHost()?.remove();
  setTimeout(() => mount(tickerOverride), SPA_SETTLE_MS);
}

// ─── Initial mount ────────────────────────────────────────────────────────────

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => mount());
} else {
  mount();
}

// ─── SPA navigation detection ─────────────────────────────────────────────────
// Poll the URL instead of observing all DOM mutations — far less resource
// intensive on a content-heavy SPA like Questrade.

let lastUrl = location.href;

setInterval(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    remount(); // fresh detect() on the new route
  }
}, URL_POLL_MS);

// ─── Popup messages ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'MANUAL_TICKER' && typeof message.symbol === 'string') {
    remount(message.symbol.trim().toUpperCase());
  }
});
