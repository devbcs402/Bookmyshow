/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        admin: {
          sidebar: '#0A101D',
          sidebarActive: '#1E293B',
          sidebarHover: '#131D31',
          primary: '#2563EB',
          primaryHover: '#1D4ED8',
          accent: '#0284C7',
          surface: '#F8FAFC',
          card: '#FFFFFF',
          border: '#E2E8F0',
          textMain: '#0F172A',
          textMuted: '#64748B'
        },
        brand: {
          DEFAULT: '#E50914',
          hover: '#C80813',
          dark: '#B00710'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'admin-card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'admin-elevated': '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        'admin-dropdown': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)'
      }
    },
  },
  plugins: [],
}

