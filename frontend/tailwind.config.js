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
        mono:    ['Inter', 'sans-serif'],
      },
      colors: {
        bg: {
          base:     '#0d0d14',
          surface:  '#13131f',
          elevated: '#1a1a2e',
          border:   '#252540',
        },
        violet: {
          900: '#1e0a3c',
          700: '#5b21b6',
          500: '#8b5cf6',
          400: '#a78bfa',
          300: '#c4b5fd',
        },
        yellow: {
          500: '#eab308',
          400: '#facc15',
          300: '#fde047',
        },
        text: {
          primary:   '#f1f0ff',
          secondary: '#9ca3af',
          muted:     '#6b7280',
          accent:    '#a78bfa',
        },
        green: {
          500: '#22c55e',
        },
        red: {
          500: '#ef4444',
        },
      },
      boxShadow: {
        'violet-glow': '0 0 20px rgba(139, 92, 246, 0.2)',
        'yellow-glow': '0 0 20px rgba(234, 179, 8, 0.15)',
        'card':        '0 4px 24px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
}