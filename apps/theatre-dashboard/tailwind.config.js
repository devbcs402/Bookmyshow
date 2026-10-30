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
        partner: {
          50: '#F0F9FF',
          100: '#E0F2FE',
          500: '#0284C7',
          600: '#0369A1',
          700: '#075985',
          800: '#0C4A6E',
          900: '#082F49'
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
          silver: '#94A3B8',
          aisle: '#0F172A',
          disabled: '#475569'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'card-glow': '0 0 20px -5px rgba(2, 132, 199, 0.15)',
        'danger-glow': '0 0 20px -5px rgba(229, 9, 20, 0.25)',
        'seat-hover': '0 0 10px rgba(56, 189, 248, 0.5)'
      }
    },
  },
  plugins: [],
}

