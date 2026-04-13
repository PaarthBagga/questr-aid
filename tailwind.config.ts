import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}', './popup/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        // Questrade brand palette
        q: {
          purple:        '#5C2D8E',
          purpleLight:   '#7B4CB6',
          purplePale:    '#EDE5F7',
          green:         '#00A86B',
          greenPale:     '#E6F7F1',
          bg:            '#F7F7FB',
          card:          '#FFFFFF',
          border:        '#E4E2EC',
          textPrimary:   '#1A1A2A',
          textSecondary: '#6B6B80',
          textMuted:     '#9B9BAA',
          success:       '#22C55E',
          warning:       '#F59E0B',
          danger:        '#EF4444',
          info:          '#3B82F6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 4px 24px rgba(92, 45, 142, 0.12)',
      },
    },
  },
  plugins: [],
} satisfies Config;
