/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        heading: ['Montserrat', 'sans-serif'],
        body:    ['Poppins', 'sans-serif'],
        mono:    ['Inter', 'monospace'],
      },
      colors: {
        bg: {
          base:     '#080810',
          surface:  '#0f0f1a',
          elevated: '#161625',
          border:   '#1e1e35',
        },
        amber: {
          600: '#d97706',
          500: '#f59e0b',
          400: '#fbbf24',
          300: '#fcd34d',
          200: '#fde68a',
        },
        violet: {
          900: '#1e0a3c',
          700: '#5b21b6',
          600: '#7c3aed',
          500: '#8b5cf6',
          400: '#a78bfa',
          300: '#c4b5fd',
        },
        slate: {
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
          600: '#475569',
          500: '#64748b',
          400: '#94a3b8',
          300: '#cbd5e1',
        },
        text: {
          primary:   '#f1f0ff',
          secondary: '#94a3b8',
          muted:     '#64748b',
          accent:    '#fbbf24',
        },
        green: {
          600: '#059669',
          500: '#10b981',
          400: '#34d399',
        },
        red: {
          600: '#dc2626',
          500: '#ef4444',
          400: '#f87171',
        },
        yellow: {
          500: '#eab308',
          400: '#facc15',
          300: '#fde047',
        },
      },
      boxShadow: {
        'amber-glow':  '0 0 30px rgba(245, 158, 11, 0.25)',
        'amber-sm':    '0 0 15px rgba(245, 158, 11, 0.15)',
        'violet-glow': '0 0 30px rgba(139, 92, 246, 0.25)',
        'violet-sm':   '0 0 15px rgba(139, 92, 246, 0.15)',
        'green-glow':  '0 0 20px rgba(16, 185, 129, 0.2)',
        'card':        '0 4px 32px rgba(0,0,0,0.5)',
        'card-hover':  '0 8px 48px rgba(0,0,0,0.6)',
        'glass':       'inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.4)',
      },
      backgroundImage: {
        'hero-mesh':      'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(245,158,11,0.15) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(139,92,246,0.12) 0%, transparent 50%)',
        'amber-gradient': 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        'violet-gradient':'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
        'card-gradient':  'linear-gradient(160deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
      },
      animation: {
        'fade-in':    'fadeIn 0.3s ease-out',
        'fade-up':    'fadeUp 0.4s ease-out',
        'scale-in':   'scaleIn 0.2s ease-out',
        'check-draw': 'checkDraw 0.5s ease-out forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer':    'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: '0' }, to: { opacity: '1' } },
        fadeUp:    { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        scaleIn:   { from: { opacity: '0', transform: 'scale(0.95)' }, to: { opacity: '1', transform: 'scale(1)' } },
        checkDraw: { from: { 'stroke-dashoffset': '100' }, to: { 'stroke-dashoffset': '0' } },
        shimmer:   { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } },
      },
    },
  },
  plugins: [],
}