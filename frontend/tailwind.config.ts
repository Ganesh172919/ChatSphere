import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        white: 'rgb(var(--color-text-white) / <alpha-value>)',
        gray: {
          200: 'rgb(var(--color-gray-200) / <alpha-value>)',
          300: 'rgb(var(--color-gray-300) / <alpha-value>)',
          400: 'rgb(var(--color-gray-400) / <alpha-value>)',
          500: 'rgb(var(--color-gray-500) / <alpha-value>)',
          600: 'rgb(var(--color-gray-600) / <alpha-value>)',
        },
        navy: {
          900: 'rgb(var(--color-navy-900) / <alpha-value>)',
          800: 'rgb(var(--color-navy-800) / <alpha-value>)',
          700: 'rgb(var(--color-navy-700) / <alpha-value>)',
          600: 'rgb(var(--color-navy-600) / <alpha-value>)',
          500: 'rgb(var(--color-navy-500) / <alpha-value>)',
        },
        neon: {
          purple: '#A855F7',
          blue: '#3B82F6',
          coral: '#F97316',
        },
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'thinking': 'thinking 1.4s ease-in-out infinite',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.3s ease-out forwards',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'drift1': 'drift1 18s ease-in-out infinite',
        'drift2': 'drift2 22s ease-in-out infinite',
        'drift3': 'drift3 26s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px) scale(1)' },
          '50%': { transform: 'translateY(-20px) scale(1.05)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(168, 85, 247, 0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(168, 85, 247, 0.6), 0 0 60px rgba(168, 85, 247, 0.2)' },
        },
        thinking: {
          '0%, 80%, 100%': { transform: 'scale(0.3)', opacity: '0.3' },
          '40%': { transform: 'scale(1)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(168, 85, 247, 0.2)' },
          '50%': { boxShadow: '0 0 20px rgba(168, 85, 247, 0.4), 0 0 40px rgba(59, 130, 246, 0.2)' },
        },
        drift1: {
          '0%, 100%': { transform: 'translate(0px, 0px)' },
          '33%': { transform: 'translate(60px, 40px)' },
          '66%': { transform: 'translate(-30px, 60px)' },
        },
        drift2: {
          '0%, 100%': { transform: 'translate(0px, 0px)' },
          '33%': { transform: 'translate(-50px, 60px)' },
          '66%': { transform: 'translate(40px, -40px)' },
        },
        drift3: {
          '0%, 100%': { transform: 'translate(0px, 0px)' },
          '33%': { transform: 'translate(40px, -50px)' },
          '66%': { transform: 'translate(-60px, 30px)' },
        },
      },
    },
  },
  plugins: [],
}

export default config