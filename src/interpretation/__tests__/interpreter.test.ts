import { describe, it, expect } from 'vitest';
import { interpret, interpretDrip } from '../interpreter';
import type { EpsResult, PeResult, YieldResult, PayoutResult, VolumeResult, MarketCapResult, DripResult } from '../../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeInputs(overrides: Partial<Parameters<typeof interpret>[0]> = {}): Parameters<typeof interpret>[0] {
  return {
    eps:          { value: 1.89,  signal: 'good'    } satisfies EpsResult,
    pe:           { value: 14.5,  signal: 'good'    } satisfies PeResult,
    dividendYield:{ value: 0.05,  signal: 'quality' } satisfies YieldResult,
    payoutRatio:  { value: 0.54, percent: 54, signal: 'healthy' } satisfies PayoutResult,
    volume:       { signal: 'good' } satisfies VolumeResult,
    marketCap:    { value: 50e9, label: 'Large Cap', tier: 'large' } satisfies MarketCapResult,
    stockType:    'dividend',
    ...overrides,
  };
}

// ─── interpret() ─────────────────────────────────────────────────────────────

describe('interpret — EPS', () => {
  it('returns positive message for good EPS', () => {
    const msgs = interpret(makeInputs());
    expect(msgs.some(m => m.severity === 'positive' && m.text.includes('profitable'))).toBe(true);
  });

  it('returns warning for bad EPS', () => {
    const msgs = interpret(makeInputs({ eps: { value: -0.50, signal: 'bad' } }));
    expect(msgs.some(m => m.severity === 'warning' && m.text.includes('losing money'))).toBe(true);
  });

  it('produces no EPS message when signal is unknown', () => {
    const msgs = interpret(makeInputs({ eps: { value: null, signal: 'unknown' } }));
    expect(msgs.some(m => m.text.toLowerCase().includes('eps'))).toBe(false);
  });
});

describe('interpret — P/E', () => {
  it('returns positive for good P/E', () => {
    const msgs = interpret(makeInputs({ pe: { value: 14, signal: 'good' } }));
    expect(msgs.some(m => m.severity === 'positive' && m.text.includes('14.0'))).toBe(true);
  });

  it('returns caution for elevated P/E', () => {
    const msgs = interpret(makeInputs({ pe: { value: 35, signal: 'elevated' } }));
    expect(msgs.some(m => m.severity === 'caution' && m.text.includes('35.0'))).toBe(true);
  });

  it('returns warning for overvalued P/E', () => {
    const msgs = interpret(makeInputs({ pe: { value: 120, signal: 'overvalued' } }));
    expect(msgs.some(m => m.severity === 'warning' && m.text.includes('120.0'))).toBe(true);
  });

  it('returns warning for negative earnings P/E', () => {
    const msgs = interpret(makeInputs({ pe: { value: null, signal: 'negative_earnings' } }));
    expect(msgs.some(m => m.severity === 'warning' && m.text.includes('negative'))).toBe(true);
  });

  // Guards against null.toFixed() regression
  it('does NOT produce a P/E message when value is null and signal is unknown', () => {
    const msgs = interpret(makeInputs({ pe: { value: null, signal: 'unknown' } }));
    expect(msgs.some(m => m.text.includes('P/E of'))).toBe(false);
  });
});

describe('interpret — Dividend Yield', () => {
  it('signals quality yield', () => {
    const msgs = interpret(makeInputs({ dividendYield: { value: 0.05, signal: 'quality' } }));
    expect(msgs.some(m => m.severity === 'positive' && m.text.includes('5.00%'))).toBe(true);
  });

  it('signals red flag for high yield', () => {
    const msgs = interpret(makeInputs({ dividendYield: { value: 0.09, signal: 'red_flag' } }));
    expect(msgs.some(m => m.severity === 'warning' && m.text.includes('9.00%'))).toBe(true);
  });

  it('signals growth stock for no dividend', () => {
    const msgs = interpret(makeInputs({ dividendYield: { value: 0, signal: 'none' }, stockType: 'growth' }));
    expect(msgs.some(m => m.text.includes('growth-oriented'))).toBe(true);
  });

  // Guards against null.toFixed() regression
  it('does not crash when yield value is null (low signal)', () => {
    expect(() =>
      interpret(makeInputs({ dividendYield: { value: null, signal: 'low' } }))
    ).not.toThrow();
  });
});

describe('interpret — Payout Ratio', () => {
  it('signals healthy payout', () => {
    const msgs = interpret(makeInputs({ payoutRatio: { value: 0.54, percent: 54, signal: 'healthy' } }));
    expect(msgs.some(m => m.severity === 'positive' && m.text.includes('54%'))).toBe(true);
  });

  it('signals critical payout', () => {
    const msgs = interpret(makeInputs({ payoutRatio: { value: 1.20, percent: 120, signal: 'critical' } }));
    expect(msgs.some(m => m.severity === 'warning' && m.text.includes('100%'))).toBe(true);
  });

  // Guards against null.toFixed() regression
  it('does not crash when percent is null', () => {
    expect(() =>
      interpret(makeInputs({ payoutRatio: { value: null, percent: null, signal: 'unknown' } }))
    ).not.toThrow();
  });
});

describe('interpret — Volume', () => {
  it('flags low volume with cap context', () => {
    const msgs = interpret(makeInputs({ volume: { signal: 'low' } }));
    expect(msgs.some(m => m.severity === 'caution' && m.text.includes('Large Cap'))).toBe(true);
  });

  it('produces no volume message for good volume', () => {
    const msgs = interpret(makeInputs({ volume: { signal: 'good' } }));
    expect(msgs.some(m => m.text.toLowerCase().includes('volume'))).toBe(false);
  });
});

// ─── interpretDrip() ──────────────────────────────────────────────────────────

describe('interpretDrip', () => {
  it('returns empty array for null drip', () => {
    expect(interpretDrip(null)).toHaveLength(0);
  });

  it('returns positive message when DRIP is satisfied', () => {
    const drip: DripResult = {
      sharesNeeded: 229,
      dividendReceived: 27.48,
      dripSatisfied: true,
      totalInvestment: 6286.05,
      frequency: 'monthly',
    };
    const msgs = interpretDrip(drip);
    expect(msgs.some(m => m.severity === 'positive')).toBe(true);
    expect(msgs.some(m => m.text.includes('229'))).toBe(true);
  });

  it('returns caution message when DRIP is not satisfied', () => {
    const drip: DripResult = {
      sharesNeeded: 10,
      dividendReceived: 0.80,
      dripSatisfied: false,
      totalInvestment: 100,
      frequency: 'quarterly',
    };
    const msgs = interpretDrip(drip);
    expect(msgs.some(m => m.severity === 'caution')).toBe(true);
  });

  it('uses correct period label for monthly frequency', () => {
    const drip: DripResult = { sharesNeeded: 100, dividendReceived: 30, dripSatisfied: true, totalInvestment: 3000, frequency: 'monthly' };
    const msgs = interpretDrip(drip);
    expect(msgs.some(m => m.text.includes('month'))).toBe(true);
  });

  it('uses correct period label for quarterly frequency', () => {
    const drip: DripResult = { sharesNeeded: 100, dividendReceived: 30, dripSatisfied: true, totalInvestment: 3000, frequency: 'quarterly' };
    const msgs = interpretDrip(drip);
    expect(msgs.some(m => m.text.includes('quarter'))).toBe(true);
  });
});
