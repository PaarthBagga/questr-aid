import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: ReactNode;
  /** Short plain-English definition shown on hover */
  definition: string;
  /** Optional coloured dot to signal quality */
  signal?: 'good' | 'caution' | 'warning' | 'neutral' | 'none';
}

const SIGNAL_DOT: Record<NonNullable<Props['signal']>, string> = {
  good:    'bg-q-success',
  caution: 'bg-q-warning',
  warning: 'bg-q-danger',
  neutral: 'bg-q-textMuted',
  none:    'hidden',
};

export function KpiCard({ label, value, definition, signal = 'none' }: Props) {
  return (
    <div className="qa-kpi-row group relative">
      <div className="flex items-center gap-1.5">
        {signal !== 'none' && (
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${SIGNAL_DOT[signal]}`} />
        )}
        <span className="text-xs text-q-textSecondary">{label}</span>
        {/* Tooltip trigger */}
        <span className="text-q-textMuted cursor-help text-[10px] leading-none select-none">ⓘ</span>
      </div>

      <span className="text-sm font-semibold text-q-textPrimary">{value}</span>

      {/* Tooltip */}
      <div className="
        absolute left-0 bottom-full mb-1.5 z-50 hidden group-hover:block
        w-56 rounded-lg bg-q-textPrimary text-white text-[11px] leading-relaxed
        px-3 py-2 shadow-lg pointer-events-none
      ">
        {definition}
      </div>
    </div>
  );
}
