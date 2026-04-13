import { describe, it, expect } from 'vitest';
import { detectFrequency, perPeriodDividend, calculateDrip } from '../drip';

// ─── detectFrequency ─────────────────────────────────────────────────────────

describe('detectFrequency', () => {
  const nowSec = () => Date.now() / 1000;

  function makeEvents(count: number) {
    return Array.from({ length: count }, (_, i) => ({
      amount: 0.25,
      date: nowSec() - i * (30 * 24 * 60 * 60), // spaced ~30 days apart
    }));
  }

  it('returns unknown for empty array', () => {
    expect(detectFrequency([])).toBe('unknown');
  });
  it('returns monthly for 8+ events in the last year', () => {
    expect(detectFrequency(makeEvents(12))).toBe('monthly');
    expect(detectFrequency(makeEvents(8))).toBe('monthly');
  });
  it('returns quarterly for 3–5 events in the last year', () => {
    expect(detectFrequency(makeEvents(4))).toBe('quarterly');
  });
  it('returns annual for 1–2 events in the last year', () => {
    expect(detectFrequency(makeEvents(1))).toBe('annual');
  });
  it('ignores events older than one year', () => {
    const old = { amount: 0.25, date: nowSec() - 400 * 24 * 60 * 60 };
    expect(detectFrequency([old])).toBe('unknown');
  });
});

// ─── perPeriodDividend ────────────────────────────────────────────────────────

describe('perPeriodDividend', () => {
  it('returns null for null annualRate', () => {
    expect(perPeriodDividend(null, 'quarterly')).toBeNull();
  });
  it('returns null for zero annualRate', () => {
    expect(perPeriodDividend(0, 'monthly')).toBeNull();
  });
  it('divides by 4 for quarterly', () => {
    expect(perPeriodDividend(1.44, 'quarterly')).toBeCloseTo(0.36);
  });
  it('divides by 12 for monthly', () => {
    expect(perPeriodDividend(1.44, 'monthly')).toBeCloseTo(0.12);
  });
  it('divides by 1 for annual', () => {
    expect(perPeriodDividend(1.44, 'annual')).toBeCloseTo(1.44);
  });
  it('defaults to /4 for unknown frequency', () => {
    expect(perPeriodDividend(1.44, 'unknown')).toBeCloseTo(0.36);
  });
});

// ─── calculateDrip ────────────────────────────────────────────────────────────

describe('calculateDrip', () => {
  it('returns null when price is null', () => {
    expect(calculateDrip(null, 0.12, 'monthly')).toBeNull();
  });
  it('returns null when dividend is null', () => {
    expect(calculateDrip(27.45, null, 'monthly')).toBeNull();
  });
  it('returns null when dividend is zero', () => {
    expect(calculateDrip(27.45, 0, 'monthly')).toBeNull();
  });

  it('matches the spec example — monthly', () => {
    // S=$27.45, D=$0.12 → N=229, dividendReceived=$27.48, P=$6,286.05
    const result = calculateDrip(27.45, 0.12, 'monthly');
    expect(result).not.toBeNull();
    expect(result!.sharesNeeded).toBe(229);
    expect(result!.dividendReceived).toBeCloseTo(27.48, 2);
    expect(result!.dripSatisfied).toBe(true);
    expect(result!.totalInvestment).toBeCloseTo(6286.05, 1);
  });

  it('sets dripSatisfied = true when N×D >= S', () => {
    const result = calculateDrip(10, 0.10, 'quarterly'); // N=100, 100×0.10=$10 = S
    expect(result!.dripSatisfied).toBe(true);
  });

  it('rounds sharesNeeded up (ceil)', () => {
    // S=10, D=0.3 → exact=33.33 → N=34
    const result = calculateDrip(10, 0.3, 'quarterly');
    expect(result!.sharesNeeded).toBe(34);
  });

  it('stores frequency on the result', () => {
    const result = calculateDrip(27.45, 0.12, 'monthly');
    expect(result!.frequency).toBe('monthly');
  });
});
