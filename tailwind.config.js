/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        catan: {
          wood: '#8B5E3C',
          brick: '#C1440E',
          sheep: '#7CB518',
          wheat: '#F5C518',
          ore: '#708090',
          desert: '#D4A96A',
          water: '#1E6091',
          bg: '#0F1923',
          panel: '#1A2535',
          border: '#2A3A50',
        },
        player: {
          red: '#EF4444',
          blue: '#3B82F6',
          green: '#22C55E',
          orange: '#F97316',
          white: '#F1F5F9',
        },
      },
      fontFamily: {
        display: ['Georgia', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'dice-roll': 'diceRoll 0.6s ease-in-out',
        'float-up': 'floatUp 1.5s ease-out forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        shimmer: 'shimmer 1.5s infinite',
      },
      keyframes: {
        diceRoll: {
          '0%, 100%': { transform: 'rotate(0deg) scale(1)' },
          '25%': { transform: 'rotate(-15deg) scale(1.1)' },
          '75%': { transform: 'rotate(15deg) scale(1.1)' },
        },
        floatUp: {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(-60px)', opacity: '0' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
