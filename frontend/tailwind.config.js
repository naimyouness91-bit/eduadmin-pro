/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      screens: {
        xs: '375px',
      },
      fontFamily: {
        sans: ['"DM Sans"', '"Noto Sans Arabic"', 'system-ui', 'sans-serif'],
        display: ['Sora', '"Noto Sans Arabic"', 'system-ui', 'sans-serif'],
        arabic: ['"Noto Sans Arabic"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        primary: {
          DEFAULT: 'rgb(var(--color-primary-500) / <alpha-value>)',
          50: 'rgb(var(--color-primary-50) / <alpha-value>)',
          100: 'rgb(var(--color-primary-100) / <alpha-value>)',
          200: 'rgb(var(--color-primary-200) / <alpha-value>)',
          300: 'rgb(var(--color-primary-300) / <alpha-value>)',
          400: 'rgb(var(--color-primary-400) / <alpha-value>)',
          500: 'rgb(var(--color-primary-500) / <alpha-value>)',
          600: 'rgb(var(--color-primary-600) / <alpha-value>)',
          700: 'rgb(var(--color-primary-700) / <alpha-value>)',
          800: 'rgb(var(--color-primary-800) / <alpha-value>)',
          900: 'rgb(var(--color-primary-900) / <alpha-value>)',
          950: 'rgb(var(--color-primary-950) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: '#22c55e',
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        surface: {
          DEFAULT: '#64748b',
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        danger: {
          DEFAULT: '#ef4444',
          light: '#fca5a5',
          dark: '#b91c1c',
        },
        warning: {
          DEFAULT: '#f59e0b',
          light: '#fcd34d',
          dark: '#b45309',
        },
        success: {
          DEFAULT: '#10b981',
          light: '#6ee7b7',
          dark: '#047857',
        },
        info: {
          DEFAULT: '#3b82f6',
          light: '#93c5fd',
          dark: '#1d4ed8',
        },
      },
      backgroundImage: {
        'gradient-primary': 'var(--gradient-primary)',
        'gradient-card':
          'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
        'mesh-gradient': 'var(--mesh-gradient)',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(15, 23, 42, 0.12), inset 0 1px 0 rgba(255,255,255,0.08)',
        glow: 'var(--shadow-glow)',
        card: '0 4px 24px rgba(15, 23, 42, 0.08)',
        'card-hover':
          '0 12px 40px rgba(15, 23, 42, 0.14), 0 0 0 1px rgba(99, 102, 241, 0.08)',
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out forwards',
        'slide-up': 'slide-up 0.45s ease-out forwards',
        'slide-in': 'slide-in 0.35s ease-out forwards',
        shimmer: 'shimmer 2s linear infinite',
        'spin-slow': 'spin 3s linear infinite',
        'sidebar-blob': 'sidebar-blob 8s ease-in-out infinite',
        'sidebar-blob-delayed': 'sidebar-blob 8s ease-in-out 2s infinite',
        'sidebar-logo-glow': 'sidebar-logo-glow 3s ease-in-out infinite',
        'sidebar-ripple': 'sidebar-ripple 0.6s ease-out forwards',
        'sidebar-icon-pulse': 'sidebar-icon-pulse 2.5s ease-in-out infinite',
        'sidebar-item-in': 'sidebar-item-in 0.4s ease-out forwards',
        'page-enter': 'page-enter 0.35s ease-out forwards',
        'modal-enter': 'modal-enter 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'dropdown-up': 'dropdown-pop-up 0.22s ease-out forwards',
        'dropdown-down': 'dropdown-pop-down 0.22s ease-out forwards',
        'sidebar-toggle-float': 'sidebar-toggle-float 4s ease-in-out infinite',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          '0%': { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'sidebar-blob': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(12px, -8px) scale(1.08)' },
        },
        'sidebar-logo-glow': {
          '0%, 100%': { opacity: '0.5', transform: 'scale(1)' },
          '50%': { opacity: '0.85', transform: 'scale(1.15)' },
        },
        'sidebar-ripple': {
          '0%': { transform: 'scale(0)', opacity: '0.6' },
          '100%': { transform: 'scale(24)', opacity: '0' },
        },
        'sidebar-icon-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '1' },
        },
        'sidebar-item-in': {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'page-enter': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'modal-enter': {
          '0%': { opacity: '0', transform: 'scale(0.96) translateY(10px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'dropdown-pop-up': {
          '0%': { opacity: '0', transform: 'translateY(6px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'dropdown-pop-down': {
          '0%': { opacity: '0', transform: 'translateY(-6px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'sidebar-toggle-float': {
          '0%, 100%': { transform: 'translate(-50%, -50%) translateY(0)' },
          '50%': { transform: 'translate(-50%, calc(-50% - 2px))' },
        },
      },
    },
  },
  plugins: [],
};
