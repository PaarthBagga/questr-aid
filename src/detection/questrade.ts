/**
 * Questrade-specific ticker detection.
 *
 * Strategy (in priority order):
 *  1. Manual override — set via the popup when auto-detection fails
 *  2. DOM attribute / heading heuristics  ← preferred, selectors confirmed
 *  3. URL pathname patterns               ← fallback when DOM not ready
 *  4. Return null — caller handles the empty state
 *
 * DOM is checked before URL because URL path segments like "/quote/" were
 * being captured as the ticker by the generic /trading/ fallback pattern.
 */

export interface DetectedStock {
  ticker: string;
  /** Best-effort company name, falls back to ticker if unavailable */
  name: string;
}

// ─── Manual override ──────────────────────────────────────────────────────────

/**
 * The popup writes a ticker into `host.dataset.manualTicker` when the user
 * submits one manually. We read it here so detect() transparently returns it
 * without any cross-module shared state.
 */
function fromManualOverride(): string | null {
  const host = document.getElementById('questr-aid-host');
  if (!(host instanceof HTMLElement)) return null;
  const ticker = host.dataset.manualTicker?.trim().toUpperCase();
  return ticker || null;
}

// ─── URL-based detection ──────────────────────────────────────────────────────

/**
 * Common Questrade URL patterns we try to match.
 * Each regex must capture the ticker in group 1.
 * Decode the URL first to handle percent-encoded characters (%2E for '.').
 */
const URL_PATTERNS: RegExp[] = [
  // my.questrade.com/trading/quote/AEM  (confirmed from live platform)
  /\/quote\/([A-Z]{1,6}(?:\.TO)?)\b/i,
  // my.questrade.com/trading/quotes/GOOG  (plural variant)
  /\/quotes\/([A-Z]{1,6}(?:\.TO)?)\b/i,
  // Generic symbol/ticker query params
  /[?&]symbol=([A-Z]{1,6}(?:\.TO)?)/i,
  /[?&]ticker=([A-Z]{1,6}(?:\.TO)?)/i,
  // Hash-based SPA routes
  /#.*\/([A-Z]{1,6}(?:\.TO)?)\b/i,
  // Bare query param: ?AEM or &AEM  — checked last, most ambiguous
  /[?&]([A-Z]{1,6}(?:\.TO)?)(?:&|$)/i,
];

function fromUrl(): string | null {
  let full: string;
  try {
    full = decodeURIComponent(location.href);
  } catch {
    full = location.href;
  }

  for (const pattern of URL_PATTERNS) {
    const match = full.match(pattern);
    if (match?.[1]) return match[1].toUpperCase();
  }
  return null;
}

// ─── DOM-based detection ──────────────────────────────────────────────────────

/** A ticker is 1–6 uppercase letters, optionally followed by .TO */
const TICKER_RE = /\b([A-Z]{1,6}(?:\.TO)?)\b/;

/**
 * DOM-based ticker detection.
 *
 * Confirmed via DevTools on my.questrade.com/trading/quotes:
 *
 *   <h2 data-qt="lblTitle" class="symbol-title ng-binding" role="heading">
 *     GOOG
 *   </h2>
 *
 * Primary selector: [data-qt="lblTitle"]
 * Fallback:         h2.symbol-title  (class-based, less brittle than value)
 */
function fromDom(): string | null {
  // Primary — confirmed data-qt attribute on the ticker heading
  const primary = document.querySelector('[data-qt="lblTitle"]');
  if (primary) {
    const text = primary.textContent?.trim().toUpperCase() ?? '';
    const m = text.match(TICKER_RE);
    if (m) return m[1];
  }

  // Fallback — class name on the same element type
  const byClass = document.querySelector('h2.symbol-title');
  if (byClass) {
    const text = byClass.textContent?.trim().toUpperCase() ?? '';
    const m = text.match(TICKER_RE);
    if (m) return m[1];
  }

  return null;
}

function nameFromDom(): string | null {
  // Confirmed via DevTools on my.questrade.com/trading:
  //   <small data-qt="lblDescription" class="symbol-title-wrapper__description ng-binding">
  //     AGNICO EAGLE MINES LTD (NYSE)
  //   </small>
  const desc = document.querySelector('[data-qt="lblDescription"]');
  if (desc) {
    // Strip trailing exchange suffix e.g. " (NYSE)" or " (TSX)"
    const text = desc.textContent?.trim().replace(/\s*\([^)]+\)\s*$/, '');
    if (text && text.length > 1 && text.length < 80) return text;
  }

  // Fallback — first h1 on the page
  const text = document.querySelector('h1')?.textContent?.trim();
  if (text && text.length > 1 && text.length < 80) return text;

  return null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function detect(): DetectedStock | null {
  // DOM first — confirmed selectors are more reliable than URL path parsing.
  // URL is a fallback for race conditions where DOM hasn't rendered yet.
  const ticker = fromManualOverride() ?? fromDom() ?? fromUrl();
  if (!ticker) return null;

  const name = nameFromDom() ?? ticker;
  return { ticker, name };
}
