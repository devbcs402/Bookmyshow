/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#E50914',
          hover: '#C80813',
          dark: '#B00710',
          accent: '#F84464',
          subtle: '#2E151B'
        },
        cinema: {
          darkest: '#070A10',
          dark: '#0B0F19',
          card: '#111827',
          elevated: '#1F293D',
          border: '#273147',
          muted: '#94A3B8'
        },
        seat: {
          available: '#334155',
          availableBorder: '#64748B',
          selected: '#22C55E',
          lockedMe: '#EAB308',
          lockedOther: '#EF4444',
          booked: '#1E293B',
          vip: '#A855F7',
          platinum: '#38BDF8',
          gold: '#FBBF24',
          silver: '#94A3B8'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'cinema-glow': '0 0 25px -5px rgba(229, 9, 20, 0.3)',
        'seat-selected': '0 0 10px rgba(34, 197, 94, 0.5)'
      }
    },
  },
  plugins: [],
}

