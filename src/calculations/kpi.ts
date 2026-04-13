/**
 * Pure KPI calculation and signal-rating functions.
 * No side effects — all inputs explicit, outputs are plain objects.
 * All derived fallbacks are computed here when API fields are missing.
 */

import { MARKET_CAP, PE, DIVIDEND_YIELD, PAYOUT_RATIO, EPS as EPS_THRESH, VOLUME } from '../config/thresholds';
import type {
  CapTier,
  MarketCapResult,
  EpsResult,
  PeResult,
  YieldResult,
  PayoutResult,
  VolumeResult,
  StockType,
} from '../types';

// ─── Internal helper ─────────────────────────────────────────────────────────

/** Returns null on bad input instead of Infinity / NaN. */
function safeDivide(num: number | null, den: number | null): number | null {
  if (num == null || den == null || den === 0 || !isFinite(num) || !isFinite(den)) return null;
  return num / den;
}

// ─── Market Cap ──────────────────────────────────────────────────────────────

export function classifyMarketCap(marketCap: number | null): MarketCapResult {
  if (marketCap == null || isNaN(marketCap) || marketCap < 0) {
    return { value: null, label: 'Unknown', tier: 'unknown' };
  }

  let label: string;
  let tier: CapTier;

  if      (marketCap < MARKET_CAP.MICRO) { label = 'Micro Cap'; tier = 'micro'; }
  else if (marketCap < MARKET_CAP.SMALL) { label = 'Small Cap'; tier = 'small'; }
  else if (marketCap < MARKET_CAP.MID)   { label = 'Mid Cap';   tier = 'mid';   }
  else if (marketCap < MARKET_CAP.LARGE) { label = 'Large Cap'; tier = 'large'; }
  else                                   { label = 'Mega Cap';  tier = 'mega';  }

  return { value: marketCap, label, tier };
}

// ─── EPS ─────────────────────────────────────────────────────────────────────

export function evaluateEps(eps: number | null): EpsResult {
  if (eps == null || isNaN(eps)) return { value: null, signal: 'unknown' };
  return { value: eps, signal: eps >= EPS_THRESH.POSITIVE_MIN ? 'good' : 'bad' };
}

// ─── P/E Ratio ───────────────────────────────────────────────────────────────

/**
 * P/E = Share Price / EPS
 * Uses the API-provided trailingPE if available; otherwise derives it from
 * price and eps so that the metric is always shown when the data allows.
 */
export function evaluatePE(
  price: number | null,
  eps: number | null,
  apiPE: number | null
): PeResult {
  // Prefer the API value; fall back to derived
  const pe = apiPE ?? safeDivide(price, eps);

  if (eps != null && eps <= 0) return { value: null, signal: 'negative_earnings' };
  if (pe == null) return { value: null, signal: 'unknown' };

  let signal: PeResult['signal'];
  if      (pe <= PE.GOOD)     signal = 'good';
  else if (pe <= PE.ELEVATED) signal = 'elevated';
  else                        signal = 'overvalued';

  return { value: pe, signal };
}

// ─── Dividend Yield ───────────────────────────────────────────────────────────

/**
 * Dividend Yield = Annual Dividend / Share Price
 * Uses the API-provided yield if available; otherwise derived from
 * dividendRate (annual $) and price.
 */
export function evaluateDividendYield(
  annualDividend: number | null,
  price: number | null,
  apiYield: number | null
): YieldResult {
  const dy = apiYield ?? safeDivide(annualDividend, price);

  if (dy == null) return { value: null, signal: 'unknown' };
  if (dy === 0)   return { value: 0,    signal: 'none'    };

  let signal: YieldResult['signal'];
  if      (dy < DIVIDEND_YIELD.GROWTH_MAX)   signal = 'growth';
  else if (dy < DIVIDEND_YIELD.QUALITY_MIN)  signal = 'low';
  else if (dy <= DIVIDEND_YIELD.QUALITY_MAX) signal = 'quality';
  else                                        signal = 'red_flag';

  return { value: dy, signal };
}

// ─── Payout Ratio ─────────────────────────────────────────────────────────────

/**
 * Payout Ratio = (Annual Dividend / EPS) × 100
 * Uses the API-provided ratio if available; otherwise derived.
 * Stored as a decimal (0.54) — use `.percent` for display (54).
 */
export function evaluatePayoutRatio(
  annualDividend: number | null,
  eps: number | null,
  apiPayoutRatio: number | null
): PayoutResult {
  if (eps != null && eps <= 0) {
    return { value: null, percent: null, signal: 'negative_earnings' };
  }

  const ratio = apiPayoutRatio ?? safeDivide(annualDividend, eps);
  if (ratio == null) return { value: null, percent: null, signal: 'unknown' };

  let signal: PayoutResult['signal'];
  if      (ratio < PAYOUT_RATIO.LOW)          signal = 'low';
  else if (ratio <= PAYOUT_RATIO.HEALTHY_MAX)  signal = 'healthy';
  else if (ratio <= PAYOUT_RATIO.ELEVATED_MAX) signal = 'elevated';
  else if (ratio <= PAYOUT_RATIO.DANGER_MAX)   signal = 'high';
  else                                          signal = 'critical';

  return { value: ratio, percent: ratio * 100, signal };
}

// ─── Stock Type ───────────────────────────────────────────────────────────────

/** Growth stock = no dividend or yield < 1%. */
export function classifyStockType(dividendYield: number | null): StockType {
  if (dividendYield == null || dividendYield < DIVIDEND_YIELD.GROWTH_MAX) return 'growth';
  return 'dividend';
}

// ─── Volume ───────────────────────────────────────────────────────────────────

export function evaluateVolume(volume: number | null, capTier: CapTier): VolumeResult {
  if (volume == null || isNaN(volume) || capTier === 'unknown') return { signal: 'unknown' };
  const threshold = VOLUME[capTier.toUpperCase() as keyof typeof VOLUME];
  return { signal: volume >= threshold.low ? 'good' : 'low' };
}
