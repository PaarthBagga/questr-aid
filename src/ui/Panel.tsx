/**
 * Main side panel — injected into Questrade via Shadow DOM.
 * Orchestrates: detect → fetch → compute → interpret → render.
 */

import { useState, useEffect, useCallback } from 'react';
import { detect } from '../detection/questrade';
import { fetchQuote } from '../data/fetcher';
import { classifyMarketCap, evaluateEps, evaluatePE, evaluateDividendYield, evaluatePayoutRatio, classifyStockType, evaluateVolume } from '../calculations/kpi';
import { calculateDrip } from '../calculations/drip';
import { interpret, interpretDrip } from '../interpretation/interpreter';
import { KpiCard } from './components/KpiCard';
import { DripSection } from './components/DripSection';
import { InterpretationList } from './components/InterpretationList';
import { StatusBadge } from './components/StatusBadge';
import type { QuoteData, ComputedMetrics, InterpretationMessage } from '../types';

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtPrice(n: number | null, currency = 'CAD') {
  if (n == null) return '—';
  return `$${n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function fmtPct(n: number | null) {
  if (n == null) return '—';
  return `${(n * 100).toFixed(2)}%`;
}

function fmtMarketCap(n: number | null) {
  if (n == null) return '—';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString('en-CA')}`;
}

function fmtNum(n: number | null, decimals = 2) {
  if (n == null) return '—';
  return n.toFixed(decimals);
}

// ─── Signal → badge props ─────────────────────────────────────────────────────

type CardSignal = 'good' | 'caution' | 'warning' | 'neutral' | 'none';

function peSignalToCard(s: string): CardSignal {
  if (s === 'good') return 'good';
  if (s === 'elevated') return 'caution';
  if (s === 'overvalued' || s === 'negative_earnings') return 'warning';
  return 'neutral';
}

function payoutSignalToCard(s: string): CardSignal {
  if (s === 'healthy') return 'good';
  if (s === 'low') return 'neutral';
  if (s === 'elevated') return 'caution';
  if (s === 'high' || s === 'critical') return 'warning';
  return 'neutral';
}

function yieldSignalToCard(s: string): CardSignal {
  if (s === 'quality') return 'good';
  if (s === 'low') return 'neutral';
  if (s === 'growth' || s === 'none') return 'neutral';
  if (s === 'red_flag') return 'warning';
  return 'neutral';
}

// ─── KPI definitions (tooltip text) ──────────────────────────────────────────

const DEFS = {
  pe: 'P/E Ratio: how much investors pay for every $1 the company earns. Lower generally means better value. P/E under 20 is considered reasonable.',
  eps: 'Earnings Per Share: the profit the company makes per share. Positive EPS means the company is profitable.',
  yield: 'Dividend Yield: annual dividends divided by the share price. A yield of 4–6% is generally considered quality for income stocks.',
  payout: 'Payout Ratio: what percentage of earnings is paid as dividends. 30–60% is healthy. Above 80% may signal dividend risk.',
  marketCap: 'Market Cap: total market value of all shares. Larger companies are generally more stable but grow more slowly.',
  volume: 'Volume: number of shares traded daily. Higher volume means it is easier to buy or sell without moving the price.',
};

// ─── Panel state ──────────────────────────────────────────────────────────────

type PanelState =
  | { status: 'idle' }
  | { status: 'loading'; ticker: string }
  | { status: 'success'; quote: QuoteData; metrics: ComputedMetrics; messages: InterpretationMessage[] }
  | { status: 'error'; message: string }
  | { status: 'no_ticker' };

// ─── Component ────────────────────────────────────────────────────────────────

export function Panel() {
  const [state, setState] = useState<PanelState>({ status: 'idle' });
  const [collapsed, setCollapsed] = useState(false);

  const load = useCallback(async () => {
    const detected = detect();
    if (!detected) {
      setState({ status: 'no_ticker' });
      return;
    }

    setState({ status: 'loading', ticker: detected.ticker });

    try {
      const quote = await fetchQuote(detected.ticker);

      const marketCap  = classifyMarketCap(quote.marketCap);
      const eps        = evaluateEps(quote.eps);
      const pe         = evaluatePE(quote.price, quote.eps, quote.trailingPE);
      const divYield   = evaluateDividendYield(quote.dividendRate, quote.price, quote.dividendYield);
      const payout     = evaluatePayoutRatio(quote.dividendRate, quote.eps, quote.payoutRatio);
      const stockType  = classifyStockType(divYield.value);
      const volume     = evaluateVolume(quote.volume, marketCap.tier);
      const drip       = calculateDrip(quote.price, quote.dividendPerPeriod, quote.dividendFrequency);

      const metrics: ComputedMetrics = { marketCap, eps, pe, dividendYield: divYield, payoutRatio: payout, stockType, volume, drip };

      const messages = [
        ...interpret({ eps, pe, dividendYield: divYield, payoutRatio: payout, volume, marketCap, stockType }),
        ...interpretDrip(drip),
      ];

      setState({ status: 'success', quote, metrics, messages });
    } catch (err) {
      setState({ status: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Header (always visible) ────────────────────────────────────────────────
  const header = (
    <div className="flex items-center justify-between px-4 py-3 bg-q-purple rounded-t-xl">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
          <span className="text-white text-[9px] font-black">Q</span>
        </div>
        <span className="text-white text-sm font-bold tracking-tight">Questr-aid</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={load}
          title="Refresh"
          className="text-white/70 hover:text-white text-xs px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors"
        >
          ↻
        </button>
        <button
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? 'Expand' : 'Collapse'}
          className="text-white/70 hover:text-white text-xs px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors"
        >
          {collapsed ? '▲' : '▼'}
        </button>
      </div>
    </div>
  );

  if (collapsed) {
    return (
      <div className="w-72 shadow-panel rounded-xl overflow-hidden">
        {header}
      </div>
    );
  }

  // ── Body states ────────────────────────────────────────────────────────────
  let body: React.ReactNode;

  if (state.status === 'idle' || state.status === 'loading') {
    body = (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <div className="w-6 h-6 rounded-full border-2 border-q-purple border-t-transparent animate-spin" />
        <p className="text-xs text-q-textSecondary">
          {state.status === 'loading' ? `Loading ${state.ticker}…` : 'Initialising…'}
        </p>
      </div>
    );
  } else if (state.status === 'no_ticker') {
    body = (
      <div className="py-8 px-4 text-center">
        <p className="text-sm text-q-textSecondary">No stock detected on this page.</p>
        <p className="text-[11px] text-q-textMuted mt-1">Navigate to a stock quote page on Questrade.</p>
      </div>
    );
  } else if (state.status === 'error') {
    body = (
      <div className="py-6 px-4 text-center">
        <p className="text-xs text-q-danger font-medium">Could not load data</p>
        <p className="text-[11px] text-q-textMuted mt-1">{state.message}</p>
        <button
          onClick={load}
          className="mt-3 text-xs text-q-purple underline hover:no-underline"
        >
          Try again
        </button>
      </div>
    );
  } else {
    // ── Success ──────────────────────────────────────────────────────────────
    const { quote, metrics, messages } = state;
    const { marketCap, eps, pe, dividendYield, payoutRatio, stockType, drip } = metrics;

    body = (
      <div className="qa-scroll overflow-y-auto max-h-[calc(100vh-120px)] divide-y divide-q-border">

        {/* Company header */}
        <div className="px-4 py-3 bg-q-purplePale">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-q-textMuted font-medium">{quote.symbol}</p>
              <p className="text-sm font-bold text-q-textPrimary leading-tight">{quote.name}</p>
            </div>
            <div className="text-right">
              <p className="text-base font-black text-q-purple">{fmtPrice(quote.price, quote.currency)}</p>
              <StatusBadge
                severity={stockType === 'dividend' ? 'positive' : 'info'}
                label={stockType === 'dividend' ? 'Dividend Stock' : 'Growth Stock'}
              />
            </div>
          </div>
          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <span className="qa-pill bg-q-purple text-white">{marketCap.label}</span>
            <span className="text-[10px] text-q-textMuted">{fmtMarketCap(marketCap.value)}</span>
          </div>
        </div>

        {/* Valuation */}
        <div className="px-4 py-3">
          <p className="qa-section-title">Valuation</p>
          <KpiCard label="EPS" value={`$${fmtNum(eps.value)}`} definition={DEFS.eps}
            signal={eps.signal === 'good' ? 'good' : eps.signal === 'bad' ? 'warning' : 'neutral'} />
          <KpiCard label="P/E Ratio" value={fmtNum(pe.value, 1)} definition={DEFS.pe}
            signal={peSignalToCard(pe.signal)} />
        </div>

        {/* Dividends */}
        <div className="px-4 py-3">
          <p className="qa-section-title">Dividends</p>
          <KpiCard label="Dividend Yield" value={fmtPct(dividendYield.value)} definition={DEFS.yield}
            signal={yieldSignalToCard(dividendYield.signal)} />
          <KpiCard label="Annual Dividend" value={fmtPrice(quote.dividendRate, quote.currency)} definition="Total dividends paid per share over one year." signal="none" />
          <KpiCard label="Per Period" value={fmtPrice(quote.dividendPerPeriod, quote.currency)} definition={`Estimated ${quote.dividendFrequency} dividend payment per share.`} signal="none" />
          <KpiCard label="Payout Ratio" value={payoutRatio.percent != null ? `${payoutRatio.percent.toFixed(0)}%` : '—'} definition={DEFS.payout}
            signal={payoutSignalToCard(payoutRatio.signal)} />
        </div>

        {/* DRIP */}
        <div className="px-4 py-3">
          <p className="qa-section-title">DRIP Analysis</p>
          <DripSection drip={drip} frequency={quote.dividendFrequency} />
        </div>

        {/* Interpretation */}
        {messages.length > 0 && (
          <div className="px-4 py-3">
            <p className="qa-section-title">Insights</p>
            <InterpretationList messages={messages} />
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-2 bg-q-bg">
          <p className="text-[9px] text-q-textMuted text-center">
            Data via Yahoo Finance · Not financial advice · Always do your own research
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-72 bg-q-card shadow-panel rounded-xl overflow-hidden flex flex-col">
      {header}
      {body}
    </div>
  );
}
