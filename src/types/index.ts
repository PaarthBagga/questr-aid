// ─── Shared types used across all modules ────────────────────────────────────

export type DividendFrequency = 'monthly' | 'quarterly' | 'annual' | 'unknown';

export type CapTier = 'micro' | 'small' | 'mid' | 'large' | 'mega' | 'unknown';

export type Severity = 'positive' | 'neutral' | 'caution' | 'warning' | 'info';

export type EpsSignal = 'good' | 'bad' | 'unknown';

export type PeSignal =
  | 'good'
  | 'elevated'
  | 'overvalued'
  | 'negative_earnings'
  | 'unknown';

export type PayoutSignal =
  | 'low'
  | 'healthy'
  | 'elevated'
  | 'high'
  | 'critical'
  | 'negative_earnings'
  | 'unknown';

export type YieldSignal = 'none' | 'growth' | 'low' | 'quality' | 'red_flag' | 'unknown';

export type VolumeSignal = 'good' | 'low' | 'unknown';

export type StockType = 'growth' | 'dividend';

// ─── Normalised quote returned by the background service worker ───────────────

export interface QuoteData {
  symbol: string;
  name: string;
  currency: string;
  price: number;
  volume: number;
  marketCap: number | null;
  sharesOutstanding: number | null;
  eps: number | null;
  trailingPE: number | null;
  /** Annual dividend amount in local currency (e.g. $1.02 CAD/year) */
  dividendRate: number | null;
  /** As a decimal, e.g. 0.034 for 3.4% */
  dividendYield: number | null;
  /** As a decimal, e.g. 0.54 for 54% */
  payoutRatio: number | null;
  dividendFrequency: DividendFrequency;
  /** Per-period dividend amount derived from dividendRate / frequency divisor */
  dividendPerPeriod: number | null;
}

// ─── KPI evaluation results ───────────────────────────────────────────────────

export interface MarketCapResult {
  value: number | null;
  label: string;
  tier: CapTier;
}

export interface EpsResult {
  value: number | null;
  signal: EpsSignal;
}

export interface PeResult {
  value: number | null;
  signal: PeSignal;
}

export interface YieldResult {
  value: number | null;
  signal: YieldSignal;
}

export interface PayoutResult {
  value: number | null;
  /** value × 100 for display */
  percent: number | null;
  signal: PayoutSignal;
}

export interface VolumeResult {
  signal: VolumeSignal;
}

// ─── DRIP ─────────────────────────────────────────────────────────────────────

export interface DripResult {
  /** N — shares needed so that N × perPeriodDividend ≥ share price */
  sharesNeeded: number;
  /** N × perPeriodDividend */
  dividendReceived: number;
  /** true when dividendReceived ≥ share price */
  dripSatisfied: boolean;
  /** P — total capital required = N × price */
  totalInvestment: number;
  frequency: DividendFrequency;
}

// ─── Interpretation ───────────────────────────────────────────────────────────

export interface InterpretationMessage {
  text: string;
  severity: Severity;
}

// ─── Aggregated computed metrics passed to the UI ────────────────────────────

export interface ComputedMetrics {
  marketCap: MarketCapResult;
  eps: EpsResult;
  pe: PeResult;
  dividendYield: YieldResult;
  payoutRatio: PayoutResult;
  stockType: StockType;
  volume: VolumeResult;
  drip: DripResult | null;
}
