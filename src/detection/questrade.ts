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
  /\/trading\/ticker\/([A-Z]{1,6}(?:\.TO)?)/i,
  /\/trading\/([A-Z]{1,6}(?:\.TO)?)\b/i,
  /[?&]symbol=([A-Z]{1,6}(?:\.TO)?)/i,
  /[?&]ticker=([A-Z]{1,6}(?:\.TO)?)/i,
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

/**
 * CSS selectors that may contain the ticker on Questrade pages.
 * Update these once the actual DOM structure is confirmed on the live platform.
 */
const TICKER_SELECTORS = [
  '[data-symbol]',
  '[data-ticker]',
  '.symbol',
  '.ticker',
  '[class*="symbol"]',
  '[class*="ticker"]',
  '[data-testid*="symbol"]',
  '[data-testid*="ticker"]',
];

/** A ticker is 1–6 uppercase letters, optionally followed by .TO */
const TICKER_RE = /\b([A-Z]{1,6}(?:\.TO)?)\b/;

function fromDom(): string | null {
  for (const selector of TICKER_SELECTORS) {
    const el = document.querySelector(selector);
    if (!el) continue;

    // Check data attributes first — more reliable than text content
    const attr =
      (el as HTMLElement).dataset.symbol ||
      (el as HTMLElement).dataset.ticker;
    if (attr) {
      const m = attr.toUpperCase().match(TICKER_RE);
      if (m) return m[1];
    }

    // Fall back to text content
    const text = el.textContent?.trim().toUpperCase() ?? '';
    const m = text.match(TICKER_RE);
    if (m) return m[1];
  }
  return null;
}

function nameFromDom(): string | null {
  const candidates = [
    document.querySelector('h1'),
    document.querySelector('[class*="company-name"]'),
    document.querySelector('[class*="companyName"]'),
    document.querySelector('[data-testid*="company"]'),
  ];
  for (const el of candidates) {
    const text = el?.textContent?.trim();
    if (text && text.length > 1 && text.length < 80) return text;
  }
  return null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function detect(): DetectedStock | null {
  const ticker = fromManualOverride() ?? fromUrl() ?? fromDom();
  if (!ticker) return null;

  const name = nameFromDom() ?? ticker;
  return { ticker, name };
}
