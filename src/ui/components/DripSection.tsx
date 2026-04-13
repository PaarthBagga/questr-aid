import type { DripResult, DividendFrequency } from '../../types';

interface Props {
  drip: DripResult | null;
  frequency: DividendFrequency;
}

const FREQ_LABEL: Record<DividendFrequency, string> = {
  monthly:   'monthly',
  quarterly: 'quarterly',
  annual:    'annual',
  unknown:   'per period (frequency unconfirmed)',
};

function fmt(n: number) {
  return n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function DripSection({ drip, frequency }: Props) {
  if (!drip) {
    return (
      <p className="text-[11px] text-q-textMuted italic">
        Dividend data is unavailable — DRIP calculation cannot be completed.
      </p>
    );
  }

  const period = FREQ_LABEL[frequency];

  return (
    <div className="space-y-2">
      {/* Status banner */}
      <div
        className={`
          rounded-lg px-3 py-2 text-xs font-medium
          ${drip.dripSatisfied
            ? 'bg-q-greenPale text-q-green'
            : 'bg-yellow-50 text-yellow-700'}
        `}
      >
        {drip.dripSatisfied
          ? '✓ DRIP threshold met — automatic reinvestment is viable'
          : '⚠ DRIP threshold not yet met — more shares required'}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
        <div className="text-q-textSecondary">Dividend frequency</div>
        <div className="font-semibold text-q-textPrimary capitalize">{period}</div>

        <div className="text-q-textSecondary">Shares needed (N)</div>
        <div className="font-semibold text-q-textPrimary">
          {drip.sharesNeeded.toLocaleString()}
        </div>

        <div className="text-q-textSecondary">Dividend per {period.split(' ')[0]}</div>
        <div className="font-semibold text-q-textPrimary">${fmt(drip.dividendReceived)}</div>

        <div className="text-q-textSecondary">Investment needed (P)</div>
        <div className="font-bold text-q-purple">${fmt(drip.totalInvestment)}</div>
      </div>

      <p className="text-[10px] text-q-textMuted leading-relaxed">
        N × dividend ≥ share price confirms one share is auto-purchased each {period.split(' ')[0]}.
        Buy a few extra shares to buffer against price movements.
      </p>
    </div>
  );
}
