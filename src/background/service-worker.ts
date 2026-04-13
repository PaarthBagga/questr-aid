/**
 * Background service worker — sole location that contacts Yahoo Finance.
 * All API fetches go through here to sidestep CORS restrictions in content scripts.
 *
 * Message protocol (content → background):
 *   { type: 'FETCH_QUOTE', symbol: string }
 *
 * Response:
 *   { ok: true,  data: QuoteData }
 *   { ok: false, error: string   }
 */

import type { QuoteData, DividendFrequency } from '../types/index';
import { detectFrequency } from '../calculations/drip';

const YF = 'https://query1.finance.yahoo.com';
const MODULES = 'price,summaryDetail,defaultKeyStatistics';

// ─── Raw Yahoo Finance shapes (only fields we use) ────────────────────────────

interface YFRaw { raw?: number }

interface YFSummaryResult {
  price: {
    regularMarketPrice: YFRaw;
    currency: string;
    shortName: string;
    longName?: string;
    symbol: string;
    regularMarketVolume: YFRaw;
    marketCap?: YFRaw;
    sharesOutstanding?: YFRaw;
  };
  summaryDetail: {
    dividendRate?: YFRaw;
    dividendYield?: YFRaw;
    trailingPE?: YFRaw;
    payoutRatio?: YFRaw;
  };
  defaultKeyStatistics: {
    trailingEps?: YFRaw;
    sharesOutstanding?: YFRaw;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function r(field: YFRaw | undefined): number | null {
  return field?.raw ?? null;
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
  'Accept': 'application/json',
};

// ─── Quote summary fetch ──────────────────────────────────────────────────────

async function fetchSummary(symbol: string): Promise<YFSummaryResult | null> {
  try {
    const res = await fetch(
      `${YF}/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${MODULES}`,
      { headers: HEADERS }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.quoteSummary?.result?.[0] as YFSummaryResult) ?? null;
  } catch {
    return null;
  }
}

// ─── Dividend history for frequency detection ─────────────────────────────────
// Uses detectFrequency() from drip.ts — single source of truth for the logic.

async function fetchFrequency(symbol: string): Promise<DividendFrequency> {
  try {
    const res = await fetch(
      `${YF}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=3mo&range=2y&events=div`,
      { headers: HEADERS }
    );
    if (!res.ok) return 'unknown';

    const json = await res.json();
    const rawDivs = json?.chart?.result?.[0]?.events?.dividends;
    if (!rawDivs) return 'unknown';

    const events = Object.values(rawDivs) as Array<{ amount: number; date: number }>;
    return detectFrequency(events);
  } catch {
    return 'unknown';
  }
}

// ─── Normalise raw API data into QuoteData ────────────────────────────────────

const FREQ_DIVISORS: Record<DividendFrequency, number> = {
  monthly: 12, quarterly: 4, annual: 1, unknown: 4,
};

function normalise(raw: YFSummaryResult, frequency: DividendFrequency): QuoteData {
  const price = r(raw.price.regularMarketPrice) ?? 0;
  const dividendRate = r(raw.summaryDetail.dividendRate);
  const eps = r(raw.defaultKeyStatistics.trailingEps);

  // Per-period dividend derived from annual rate
  const dividendPerPeriod =
    dividendRate != null ? dividendRate / FREQ_DIVISORS[frequency] : null;

  // Payout ratio: prefer API value, derive if possible
  const payoutRatio =
    r(raw.summaryDetail.payoutRatio) ??
    (dividendRate != null && eps != null && eps > 0 ? dividendRate / eps : null);

  // Dividend yield: prefer API value, derive if possible
  const dividendYield =
    r(raw.summaryDetail.dividendYield) ??
    (dividendRate != null && price > 0 ? dividendRate / price : null);

  return {
    symbol: raw.price.symbol,
    name: raw.price.shortName || raw.price.longName || raw.price.symbol,
    currency: raw.price.currency,
    price,
    volume: r(raw.price.regularMarketVolume) ?? 0,
    marketCap: r(raw.price.marketCap),
    sharesOutstanding:
      r(raw.defaultKeyStatistics.sharesOutstanding) ?? r(raw.price.sharesOutstanding),
    eps,
    trailingPE: r(raw.summaryDetail.trailingPE),
    dividendRate,
    dividendYield,
    payoutRatio,
    dividendFrequency: frequency,
    dividendPerPeriod,
  };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

async function handleFetchQuote(
  symbol: string
): Promise<{ ok: true; data: QuoteData } | { ok: false; error: string }> {
  // Try as-is first (handles NYSE/NASDAQ tickers like AAPL).
  // If that returns no data, append .TO for TSX-listed Canadian stocks.
  const candidates = symbol.toUpperCase().endsWith('.TO')
    ? [symbol.toUpperCase()]
    : [symbol.toUpperCase(), `${symbol.toUpperCase()}.TO`];

  for (const sym of candidates) {
    const [summary, frequency] = await Promise.all([
      fetchSummary(sym),
      fetchFrequency(sym),
    ]);
    if (summary) {
      return { ok: true, data: normalise(summary, frequency) };
    }
  }

  return { ok: false, error: `No data found for "${symbol}". Check the ticker and try again.` };
}

// ─── Chrome message listener ──────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'FETCH_QUOTE' && typeof message.symbol === 'string') {
    handleFetchQuote(message.symbol)
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true; // keep message channel open for async response
  }
});
