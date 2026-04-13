/**
 * Questrade-specific ticker detection.
 *
 * Strategy (in priority order):
 *  1. Extract from the URL pathname  (most reliable, least likely to change)
 *  2. Check common DOM attributes / headings
 *  3. Return null — the popup's manual input is the final fallback
 *
 * NOTE: Questrade's SPA URL structure is not publicly documented.
 * The patterns below are best-effort and may need updating once
 * the live platform is inspected. Each strategy is isolated so
 * individual patterns can be updated without touching the others.
 */

export interface DetectedStock {
  ticker: string;
  /** Best-effort company name, falls back to ticker if unavailable */
  name: string;
}

// ─── URL-based detection ──────────────────────────────────────────────────────

/**
 * Common Questrade URL patterns we try to match.
 * Each regex must capture the ticker in group 1.
 */
const URL_PATTERNS: RegExp[] = [
  /\/trading\/ticker\/([A-Z]{1,5}(?:\.TO)?)/i,
  /\/trading\/([A-Z]{1,5}(?:\.TO)?)\b/i,
  /[?&]symbol=([A-Z]{1,5}(?:\.TO)?)/i,
  /[?&]ticker=([A-Z]{1,5}(?:\.TO)?)/i,
  /#.*\/([A-Z]{1,5}(?:\.TO)?)\b/i,
];

function fromUrl(): string | null {
  const full = location.href;
  for (const pattern of URL_PATTERNS) {
    const match = full.match(pattern);
    if (match?.[1]) return match[1].toUpperCase();
  }
  return null;
}

// ─── DOM-based detection ──────────────────────────────────────────────────────

/**
 * CSS selectors that may contain the ticker symbol on Questrade pages.
 * These are heuristic — update when the actual DOM structure is confirmed.
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

/** A ticker is 1–5 uppercase letters, optionally followed by .TO */
const TICKER_RE = /\b([A-Z]{1,5}(?:\.TO)?)\b/;

function fromDom(): string | null {
  for (const selector of TICKER_SELECTORS) {
    const el = document.querySelector(selector);
    if (!el) continue;

    // Try data attribute first
    const attr =
      (el as HTMLElement).dataset.symbol ||
      (el as HTMLElement).dataset.ticker;
    if (attr) {
      const m = attr.toUpperCase().match(TICKER_RE);
      if (m) return m[1];
    }

    // Try text content
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
  const ticker = fromUrl() ?? fromDom();
  if (!ticker) return null;

  const name = nameFromDom() ?? ticker;
  return { ticker, name };
}
