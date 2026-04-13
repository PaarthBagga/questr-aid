import type { InterpretationMessage, Severity } from '../../types';

interface Props {
  messages: InterpretationMessage[];
}

const LEFT_BORDER: Record<Severity, string> = {
  positive: 'border-q-success',
  neutral:  'border-q-textMuted',
  caution:  'border-q-warning',
  warning:  'border-q-danger',
  info:     'border-q-purple',
};

const TEXT_COLOUR: Record<Severity, string> = {
  positive: 'text-q-textPrimary',
  neutral:  'text-q-textSecondary',
  caution:  'text-yellow-800',
  warning:  'text-q-danger',
  info:     'text-q-purple',
};

export function InterpretationList({ messages }: Props) {
  if (messages.length === 0) return null;

  return (
    <ul className="space-y-1.5">
      {messages.map((msg, i) => (
        <li
          key={i}
          className={`
            border-l-2 pl-2.5 py-0.5 text-[11px] leading-relaxed
            ${LEFT_BORDER[msg.severity]} ${TEXT_COLOUR[msg.severity]}
          `}
        >
          {msg.text}
        </li>
      ))}
    </ul>
  );
}
