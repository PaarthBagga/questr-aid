/**
 * Rules-based interpretation engine.
 * Takes evaluated KPI objects and returns plain-English messages.
 *
 * Rules are intentionally conservative — never overconfident.
 * Language: "may suggest", "appears", "worth reviewing".
 */

import type {
  EpsResult,
  PeResult,
  YieldResult,
  PayoutResult,
  VolumeResult,
  DripResult,
  InterpretationMessage,
  MarketCapResult,
  StockType,
} from '../types';

interface KpiInputs {
  eps: EpsResult;
  pe: PeResult;
  dividendYield: YieldResult;
  payoutRatio: PayoutResult;
  volume: VolumeResult;
  marketCap: MarketCapResult;
  stockType: StockType;
}

export function interpret(kpis: KpiInputs): InterpretationMessage[] {
  const msgs: InterpretationMessage[] = [];

  // ── EPS ──────────────────────────────────────────────────────────────────
  if (kpis.eps.signal === 'good') {
    msgs.push({ text: 'EPS is positive — the company appears to be profitable.', severity: 'positive' });
  } else if (kpis.eps.signal === 'bad') {
    msgs.push({
      text: 'EPS is negative — the company is currently losing money. Valuation metrics like P/E may be unreliable.',
      severity: 'warning',
    });
  }

  // ── P/E ──────────────────────────────────────────────────────────────────
  if (kpis.pe.signal === 'negative_earnings') {
    msgs.push({
      text: 'P/E ratio cannot be calculated — earnings are negative. Further review of financials is recommended.',
      severity: 'warning',
    });
  } else if (kpis.pe.signal === 'good' && kpis.pe.value != null) {
    msgs.push({
      text: `P/E of ${kpis.pe.value.toFixed(1)} suggests the stock may be reasonably valued relative to earnings.`,
      severity: 'positive',
    });
  } else if (kpis.pe.signal === 'elevated' && kpis.pe.value != null) {
    msgs.push({
      text: `P/E of ${kpis.pe.value.toFixed(1)} is moderately elevated — investors are paying a premium. May reflect growth expectations.`,
      severity: 'caution',
    });
  } else if (kpis.pe.signal === 'overvalued' && kpis.pe.value != null) {
    msgs.push({
      text: `P/E of ${kpis.pe.value.toFixed(1)} is very high — the stock may be significantly overvalued, or earnings may be temporarily depressed. Worth further review.`,
      severity: 'warning',
    });
  }

  // ── Dividend Yield ────────────────────────────────────────────────────────
  if (kpis.dividendYield.signal === 'none' || kpis.dividendYield.signal === 'growth') {
    msgs.push({
      text: 'Little to no dividend — this appears to be a growth-oriented stock. Returns are expected through capital gains.',
      severity: 'info',
    });
  } else if (kpis.dividendYield.signal === 'low' && kpis.dividendYield.value != null) {
    msgs.push({
      text: `Dividend yield of ${(kpis.dividendYield.value * 100).toFixed(2)}% is below the typical quality range (4–6%). May not be a primary income stock.`,
      severity: 'neutral',
    });
  } else if (kpis.dividendYield.signal === 'quality' && kpis.dividendYield.value != null) {
    msgs.push({
      text: `Dividend yield of ${(kpis.dividendYield.value * 100).toFixed(2)}% falls within the quality range (4–6%) — suggests an attractive income stock.`,
      severity: 'positive',
    });
  } else if (kpis.dividendYield.signal === 'red_flag' && kpis.dividendYield.value != null) {
    msgs.push({
      text: `Dividend yield of ${(kpis.dividendYield.value * 100).toFixed(2)}% is unusually high (above 6%). The market may be pricing in a dividend cut, or the share price has fallen sharply. Verify sustainability carefully.`,
      severity: 'warning',
    });
  }

  // ── Payout Ratio ──────────────────────────────────────────────────────────
  if (kpis.payoutRatio.signal === 'healthy' && kpis.payoutRatio.percent != null) {
    msgs.push({
      text: `Payout ratio of ${kpis.payoutRatio.percent.toFixed(0)}% is in a healthy range (30–60%) — dividend appears reasonably sustainable.`,
      severity: 'positive',
    });
  } else if (kpis.payoutRatio.signal === 'low' && kpis.payoutRatio.percent != null) {
    msgs.push({
      text: `Payout ratio of ${kpis.payoutRatio.percent.toFixed(0)}% is low — the company may be reinvesting heavily in growth rather than returning cash to shareholders.`,
      severity: 'neutral',
    });
  } else if (kpis.payoutRatio.signal === 'elevated' && kpis.payoutRatio.percent != null) {
    msgs.push({
      text: `Payout ratio of ${kpis.payoutRatio.percent.toFixed(0)}% is elevated (60–80%) — dividend sustainability may be worth monitoring.`,
      severity: 'caution',
    });
  } else if (kpis.payoutRatio.signal === 'high' && kpis.payoutRatio.percent != null) {
    msgs.push({
      text: `Payout ratio of ${kpis.payoutRatio.percent.toFixed(0)}% is high (80–100%) — the company is paying out a large portion of earnings. Dividend risk may be elevated.`,
      severity: 'warning',
    });
  } else if (kpis.payoutRatio.signal === 'critical') {
    msgs.push({
      text: 'Payout ratio exceeds 100% — the company appears to be paying dividends it cannot fully cover from earnings. This is a potential red flag.',
      severity: 'warning',
    });
  }

  // ── Volume ────────────────────────────────────────────────────────────────
  if (kpis.volume.signal === 'low') {
    msgs.push({
      text: `Trading volume appears low for a ${kpis.marketCap.label} — liquidity may be limited. Consider the bid-ask spread when entering or exiting a position.`,
      severity: 'caution',
    });
  }

  return msgs;
}

// ─── DRIP interpretation ─────────────────────────────────────────────────────

export function interpretDrip(drip: DripResult | null): InterpretationMessage[] {
  if (!drip) return [];

  const period = drip.frequency === 'monthly' ? 'month' : drip.frequency === 'quarterly' ? 'quarter' : 'period';
  const msgs: InterpretationMessage[] = [];

  if (drip.dripSatisfied) {
    msgs.push({
      text: `DRIP is viable: ${drip.sharesNeeded.toLocaleString()} shares generate $${drip.dividendReceived.toFixed(2)} per ${period}, which covers the cost of one additional share.`,
      severity: 'positive',
    });
    msgs.push({
      text: `Estimated investment to reach DRIP threshold: $${drip.totalInvestment.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      severity: 'info',
    });
  } else {
    msgs.push({
      text: `DRIP threshold not yet met: ${drip.sharesNeeded.toLocaleString()} shares generate only $${drip.dividendReceived.toFixed(2)} per ${period}, which falls short of the share price. More shares are needed.`,
      severity: 'caution',
    });
  }

  return msgs;
}
