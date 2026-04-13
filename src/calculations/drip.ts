/**
 * DRIP (Dividend Re-Investment Plan) calculations.
 *
 * Core formula:
 *   N = ceil(S / D)         — shares needed so one period's dividend buys ≥ 1 share
 *   P = N × S               — total capital required to start DRIP
 *   Verify: N × D ≥ S       — confirms DRIP threshold is met after rounding
 *
 * Where:
 *   S = share price (CAD)
 *   D = dividend per period (monthly or quarterly amount)
 *   N = number of shares needed
 */

import type { DividendFrequency, DripResult } from '../types';

// ─── Frequency detection ─────────────────────────────────────────────────────

/**
 * Counts dividend events in the past 12 months to determine pay frequency.
 * Called with raw dividend event objects from the Yahoo Finance chart API.
 */
export function detectFrequency(
  dividendEvents: Array<{ amount: number; date: number }>
): DividendFrequency {
  if (!dividendEvents || dividendEvents.length === 0) return 'unknown';

  const oneYearAgoSec = Date.now() / 1000 - 365 * 24 * 60 * 60;
  const recentCount = dividendEvents.filter((e) => e.date >= oneYearAgoSec).length;

  if (recentCount >= 10) return 'monthly';   // 10–12 payments/year
  if (recentCount >= 3)  return 'quarterly'; // 3–5 payments/year
  if (recentCount >= 1)  return 'annual';    // 1–2 payments/year
  return 'unknown';
}

// ─── Per-period dividend ─────────────────────────────────────────────────────

const FREQUENCY_DIVISORS: Record<DividendFrequency, number> = {
  monthly:   12,
  quarterly: 4,
  annual:    1,
  unknown:   4, // default to quarterly assumption
};

/**
 * Derives the per-period dividend from the annual rate.
 * e.g. annual $1.44 with quarterly frequency → $0.36/quarter
 */
export function perPeriodDividend(
  annualDividendRate: number | null,
  frequency: DividendFrequency
): number | null {
  if (annualDividendRate == null || annualDividendRate <= 0) return null;
  return annualDividendRate / FREQUENCY_DIVISORS[frequency];
}

// ─── Core DRIP calculation ────────────────────────────────────────────────────

/**
 * Calculates all DRIP parameters for a given stock.
 * Returns null if inputs are insufficient.
 *
 * Example (from spec):
 *   S = $27.45, D = $0.12/month (monthly)
 *   N = ceil(27.45 / 0.12) = 229
 *   dividendReceived = 229 × $0.12 = $27.48  ≥  $27.45 ✓
 *   P = 229 × $27.45 = $6,286.05
 */
export function calculateDrip(
  stockPrice: number | null,
  dividendPerPeriod: number | null,
  frequency: DividendFrequency
): DripResult | null {
  if (
    stockPrice == null ||
    dividendPerPeriod == null ||
    dividendPerPeriod <= 0 ||
    stockPrice <= 0
  ) {
    return null;
  }

  const sharesNeeded = Math.ceil(stockPrice / dividendPerPeriod);
  const dividendReceived = sharesNeeded * dividendPerPeriod;
  const dripSatisfied = dividendReceived >= stockPrice;
  const totalInvestment = sharesNeeded * stockPrice;

  return { sharesNeeded, dividendReceived, dripSatisfied, totalInvestment, frequency };
}
