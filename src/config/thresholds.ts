/**
 * Central configuration — edit values here to adjust how Questr-aid
 * classifies every metric globally. No thresholds are hardcoded elsewhere.
 */

/** Market cap buckets in CAD */
export const MARKET_CAP = {
  MICRO: 300_000_000,      // < $300 M       → Micro Cap
  SMALL: 2_000_000_000,    // $300 M – $2 B  → Small Cap
  MID:   10_000_000_000,   // $2 B  – $10 B  → Mid Cap
  LARGE: 100_000_000_000,  // $10 B – $100 B → Large Cap
  //                          > $100 B        → Mega Cap
} as const;

/** P/E ratio thresholds */
export const PE = {
  GOOD:     20,   // ≤ 20  → reasonably valued
  ELEVATED: 50,   // 21–50 → elevated / growth premium
  //              → > 50  → likely overvalued
} as const;

/** Dividend yield thresholds — stored as decimals */
export const DIVIDEND_YIELD = {
  GROWTH_MAX:  0.01,  // < 1%  → growth stock, minimal income
  QUALITY_MIN: 0.04,  // 4%    → quality dividend floor
  QUALITY_MAX: 0.06,  // 6%    → quality dividend ceiling
  //                     > 6%  → red flag (too high to be sustainable)
} as const;

/** Payout ratio thresholds — stored as decimals */
export const PAYOUT_RATIO = {
  LOW:          0.30,  // < 30%   → low / reinvesting (slightly good)
  HEALTHY_MAX:  0.60,  // 30–60%  → healthy range
  ELEVATED_MAX: 0.80,  // 60–80%  → elevated, worth monitoring
  DANGER_MAX:   1.00,  // 80–100% → concerning
  //                     > 100%   → critical, likely unsustainable
} as const;

/** EPS thresholds */
export const EPS = {
  POSITIVE_MIN: 0.02,  // ≥ $0.02 → company is gaining money
} as const;

/** Minimum daily volume (shares) per cap tier before flagging low liquidity */
export const VOLUME = {
  MICRO: { low: 50_000 },
  SMALL: { low: 50_000 },
  MID:   { low: 100_000 },
  LARGE: { low: 1_000_000 },
  MEGA:  { low: 1_000_000 },
} as const;

/** ±tolerance used when matching annual dividend to determine pay frequency */
export const FREQUENCY_TOLERANCE = 0.10;
