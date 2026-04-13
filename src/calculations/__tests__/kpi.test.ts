import { describe, it, expect } from 'vitest';
import {
  classifyMarketCap,
  evaluateEps,
  evaluatePE,
  evaluateDividendYield,
  evaluatePayoutRatio,
  classifyStockType,
  evaluateVolume,
} from '../kpi';

// ─── classifyMarketCap ────────────────────────────────────────────────────────

describe('classifyMarketCap', () => {
  it('returns unknown for null', () => {
    expect(classifyMarketCap(null).tier).toBe('unknown');
  });
  it('classifies micro cap', () => {
    expect(classifyMarketCap(100_000_000).tier).toBe('micro');
  });
  it('classifies small cap', () => {
    expect(classifyMarketCap(500_000_000).tier).toBe('small');
  });
  it('classifies mid cap', () => {
    expect(classifyMarketCap(5_000_000_000).tier).toBe('mid');
  });
  it('classifies large cap', () => {
    expect(classifyMarketCap(50_000_000_000).tier).toBe('large');
  });
  it('classifies mega cap', () => {
    expect(classifyMarketCap(200_000_000_000).tier).toBe('mega');
  });
  it('formats label correctly', () => {
    expect(classifyMarketCap(50_000_000_000).label).toBe('Large Cap');
  });
});

// ─── evaluateEps ──────────────────────────────────────────────────────────────

describe('evaluateEps', () => {
  it('returns unknown for null', () => {
    expect(evaluateEps(null).signal).toBe('unknown');
  });
  it('flags negative EPS as bad', () => {
    expect(evaluateEps(-0.50).signal).toBe('bad');
  });
  it('flags zero EPS as bad', () => {
    expect(evaluateEps(0).signal).toBe('bad');
  });
  it('flags EPS below threshold as bad', () => {
    expect(evaluateEps(0.01).signal).toBe('bad');
  });
  it('flags EPS above threshold as good', () => {
    expect(evaluateEps(0.05).signal).toBe('good');
  });
  it('flags EPS exactly at threshold as good', () => {
    expect(evaluateEps(0.02).signal).toBe('good');
  });
});

// ─── evaluatePE ──────────────────────────────────────────────────────────────

describe('evaluatePE', () => {
  it('returns negative_earnings when EPS is 0', () => {
    expect(evaluatePE(100, 0, null).signal).toBe('negative_earnings');
  });
  it('returns negative_earnings when EPS is negative', () => {
    expect(evaluatePE(100, -2, null).signal).toBe('negative_earnings');
  });
  it('uses API PE when provided', () => {
    const result = evaluatePE(100, 5, 14);
    expect(result.value).toBe(14);
    expect(result.signal).toBe('good');
  });
  it('derives PE from price/eps when API PE is null', () => {
    const result = evaluatePE(100, 5, null);
    expect(result.value).toBe(20);
    expect(result.signal).toBe('good');
  });
  it('signals elevated when PE is 21–50', () => {
    expect(evaluatePE(100, 4, null).signal).toBe('elevated'); // PE = 25
  });
  it('signals overvalued when PE > 50', () => {
    expect(evaluatePE(100, 1, null).signal).toBe('overvalued'); // PE = 100
  });
  it('returns unknown when both price and apiPE are null', () => {
    expect(evaluatePE(null, null, null).signal).toBe('unknown');
  });
});

// ─── evaluateDividendYield ────────────────────────────────────────────────────

describe('evaluateDividendYield', () => {
  it('returns unknown when all inputs are null', () => {
    expect(evaluateDividendYield(null, null, null).signal).toBe('unknown');
  });
  it('returns none when yield is 0', () => {
    expect(evaluateDividendYield(0, 100, 0).signal).toBe('none');
  });
  it('signals growth for yield < 1%', () => {
    expect(evaluateDividendYield(0.50, 100, null).signal).toBe('growth'); // 0.5%
  });
  it('signals low for yield 1–4%', () => {
    expect(evaluateDividendYield(3, 100, null).signal).toBe('low'); // 3%
  });
  it('signals quality for yield 4–6%', () => {
    expect(evaluateDividendYield(5, 100, null).signal).toBe('quality'); // 5%
  });
  it('signals red_flag for yield > 6%', () => {
    expect(evaluateDividendYield(8, 100, null).signal).toBe('red_flag'); // 8%
  });
  it('prefers apiYield over derived', () => {
    const result = evaluateDividendYield(10, 100, 0.03); // apiYield 3%
    expect(result.value).toBe(0.03);
    expect(result.signal).toBe('low');
  });
});

// ─── evaluatePayoutRatio ──────────────────────────────────────────────────────

describe('evaluatePayoutRatio', () => {
  it('returns negative_earnings when EPS <= 0', () => {
    expect(evaluatePayoutRatio(1, -1, null).signal).toBe('negative_earnings');
  });
  it('signals low for payout < 30%', () => {
    expect(evaluatePayoutRatio(0.20, 1, null).signal).toBe('low');
  });
  it('signals healthy for payout 30–60%', () => {
    expect(evaluatePayoutRatio(0.50, 1, null).signal).toBe('healthy');
  });
  it('signals elevated for payout 60–80%', () => {
    expect(evaluatePayoutRatio(0.70, 1, null).signal).toBe('elevated');
  });
  it('signals high for payout 80–100%', () => {
    expect(evaluatePayoutRatio(0.90, 1, null).signal).toBe('high');
  });
  it('signals critical for payout > 100%', () => {
    expect(evaluatePayoutRatio(1.50, 1, null).signal).toBe('critical');
  });
  it('derives ratio from dividend / EPS when apiPayoutRatio is null', () => {
    const result = evaluatePayoutRatio(0.60, 1, null);
    expect(result.value).toBeCloseTo(0.60);
    expect(result.percent).toBeCloseTo(60);
  });
  it('prefers apiPayoutRatio over derived', () => {
    const result = evaluatePayoutRatio(0.90, 1, 0.45);
    expect(result.value).toBe(0.45);
    expect(result.signal).toBe('healthy');
  });
});

// ─── classifyStockType ────────────────────────────────────────────────────────

describe('classifyStockType', () => {
  it('returns growth for null yield', () => {
    expect(classifyStockType(null)).toBe('growth');
  });
  it('returns growth for yield < 1%', () => {
    expect(classifyStockType(0.005)).toBe('growth');
  });
  it('returns dividend for yield >= 1%', () => {
    expect(classifyStockType(0.04)).toBe('dividend');
  });
});

// ─── evaluateVolume ───────────────────────────────────────────────────────────

describe('evaluateVolume', () => {
  it('returns unknown for null volume', () => {
    expect(evaluateVolume(null, 'large').signal).toBe('unknown');
  });
  it('returns unknown for unknown tier', () => {
    expect(evaluateVolume(1_000_000, 'unknown').signal).toBe('unknown');
  });
  it('signals low volume for large cap below threshold', () => {
    expect(evaluateVolume(500_000, 'large').signal).toBe('low');
  });
  it('signals good volume for large cap above threshold', () => {
    expect(evaluateVolume(5_000_000, 'large').signal).toBe('good');
  });
  it('signals low volume for small cap below threshold', () => {
    expect(evaluateVolume(10_000, 'small').signal).toBe('low');
  });
  it('signals good volume for small cap above threshold', () => {
    expect(evaluateVolume(100_000, 'small').signal).toBe('good');
  });
});
