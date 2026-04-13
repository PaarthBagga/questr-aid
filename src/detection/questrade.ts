/**
 * Questrade-specific ticker detection.
 *
 * Strategy (in priority order):
 *  1. Manual override — set via the popup when auto-detection fails
 *  2. URL pathname patterns
 *  3. DOM attribute / heading heuristics
 *  4. Return null — caller handles the empty state
 *
 * NOTE: Questrade's SPA URL structure is not publicly documented.
 * The patterns below are best-effort and must be calibrated against
 * the live platform. Each strategy is isolated so individual patterns
 * can be updated without touching the others.
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
  // my.questrade.com/trading/quotes?GOOG  (confirmed from live platform)
  /[?&]([A-Z]{1,6}(?:\.TO)?)(?:&|$)/i,
  // my.questrade.com/trading/quotes/GOOG  (path-based variant)
  /\/quotes\/([A-Z]{1,6}(?:\.TO)?)\b/i,
  // Generic symbol/ticker query params
  /[?&]symbol=([A-Z]{1,6}(?:\.TO)?)/i,
  /[?&]ticker=([A-Z]{1,6}(?:\.TO)?)/i,
  // Fallback: any /trading/TICKER path segment
  /\/trading\/([A-Z]{1,6}(?:\.TO)?)\b/i,
  // Hash-based SPA routes
  /#.*\/([A-Z]{1,6}(?:\.TO)?)\b/i,
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
  // Company description element confirmed from DevTools inspection
  // Expected text: "ALPHABET INC (NASDAQ)"
  const desc = document.querySelector('[data-qa="titleDescription"]');
  if (desc) {
    const clone = desc.cloneNode(true) as Element;
    // Remove exchange <small> tag to get clean company name only
    clone.querySelectorAll('small').forEach((s) => s.remove());
    const text = clone.textContent?.trim();
    if (text && text.length > 1 && text.length < 80) return text;
  }

  // Fallback — first h1 on the page
  const text = document.querySelector('h1')?.textContent?.trim();
  if (text && text.length > 1 && text.length < 80) return text;

  return null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function detect(): DetectedStock | null {
  const ticker = fromManualOverride() ?? fromUrl() ?? fromDom();
  if (!ticker) return null;

  const name = nameFromDom() ?? ticker;
  return { ticker, name };
}
