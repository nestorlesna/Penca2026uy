/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0B0F1A',
        surface: '#141925',
        'surface-2': '#1A2030',
        border: '#1E2535',
        primary: {
          DEFAULT: '#10B981',
          hover: '#059669',
          light: '#D1FAE5',
        },
        accent: {
          DEFAULT: '#F59E0B',
          hover: '#D97706',
          light: '#FEF3C7',
        },
        text: {
          primary: '#F8FAFC',
          secondary: '#94A3B8',
          muted: '#475569',
        },
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      screens: {
        xs: '375px',
      },
    },
  },
  plugins: [],
}
