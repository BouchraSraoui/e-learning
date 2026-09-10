import type { Config } from 'tailwindcss';

/**
 * Icosnet Training Platform — design tokens (charte graphique).
 * Primary action blue #2563EB · brand cyan #00AEEF (logo).
 * Fonts: Plus Jakarta Sans (display) / Public Sans (body).
 */
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Icosnet cyan — the logo colour.
        brand: {
          50: '#E6F8FE',
          100: '#CCF1FD',
          200: '#99E3FB',
          300: '#66D4F9',
          400: '#33C6F7',
          500: '#00AEEF',
          DEFAULT: '#00AEEF',
          600: '#008BBF',
          700: '#00688F',
          800: '#004660',
          900: '#002330',
        },
        // Primary action blue (buttons, active states, auth panel).
        primary: {
          50: '#EFF5FF',
          100: '#DBE8FE',
          200: '#BFD7FE',
          300: '#93BBFD',
          400: '#609AFA',
          500: '#3B82F6',
          600: '#2563EB',
          DEFAULT: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        ink: '#0F172A',
        muted: '#64748B',
        surface: '#F8FAFC',
        line: '#E2E8F0',
      },
      fontFamily: {
        sans: ['var(--font-public-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-jakarta)', 'var(--font-public-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)',
        'card-hover': '0 4px 12px -2px rgb(15 23 42 / 0.10), 0 2px 6px -2px rgb(15 23 42 / 0.06)',
        pop: '0 10px 30px -5px rgb(15 23 42 / 0.15)',
        'primary-glow': '0 8px 24px -6px rgb(37 99 235 / 0.45)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        // Barely-perceptible ambient depth behind the hero preview card.
        'blob-drift': {
          '0%': { transform: 'translate3d(0, 0, 0) scale(1)', opacity: '0.12' },
          '100%': { transform: 'translate3d(6px, -8px, 0) scale(1.08)', opacity: '0.16' },
        },
        // From-only rises: markup is the final state, so no-JS/SSR stay correct.
        'rise-4': { from: { opacity: '0', transform: 'translateY(4px)' } },
        'rise-6': { from: { opacity: '0', transform: 'translateY(6px)' } },
        'rise-8': { from: { opacity: '0', transform: 'translateY(8px)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-up': 'slide-up 0.25s ease-out',
        'scale-in': 'scale-in 0.15s ease-out',
        // Entrance reveal — reuses slide-up; `backwards` holds the hidden state
        // through the stagger delay, then reverts to base so hover transforms work.
        enter: 'slide-up 0.4s ease-out backwards',
        'blob-drift': 'blob-drift 10s ease-in-out infinite alternate',
        'rise-4': 'rise-4 0.3s ease-out backwards',
        'rise-6': 'rise-6 0.35s ease-out backwards',
        'rise-8': 'rise-8 0.4s ease-out backwards',
      },
    },
  },
  plugins: [],
} satisfies Config;
