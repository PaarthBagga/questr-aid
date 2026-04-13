import type { Severity } from '../../types';

interface Props {
  severity: Severity;
  label: string;
}

const STYLES: Record<Severity, string> = {
  positive: 'bg-q-greenPale  text-q-green',
  neutral:  'bg-gray-100     text-q-textSecondary',
  caution:  'bg-yellow-50    text-yellow-700',
  warning:  'bg-red-50       text-q-danger',
  info:     'bg-q-purplePale text-q-purple',
};

export function StatusBadge({ severity, label }: Props) {
  return (
    <span className={`qa-pill ${STYLES[severity]}`}>
      {label}
    </span>
  );
}
