/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // Paths to all template files where you're using Tailwind classes
    './public/**/*.html',
    './public/js/**/*.js', 
  ],
  theme: {
    extend: {
      colors: {
        brand: { green: '#10B981' },
        emerald: { 100: '#D1FAE5', 400: '#34D399', 700: '#047857', 800: '#065F46', 900: '#064E3B' },
        gray: { 500: '#6B7280', 600: '#4B5563', 700: '#374151', 800: '#1F2937', 900: '#111827' },
        indigo: { 100: '#E0E7FF', 800: '#3730A3' },
        lime: { 100: '#ECFCCB', 500: '#84CC16', 800: '#3F6212' },
        sky: { 100: '#E0F2FE', 500: '#0EA5E9', 800: '#075985' },
        slate: { 50: '#F9FAFB', 100: '#F1F5F9', 200: '#E5E7EB', 300: '#D1D5DB', 800: '#1E293B' },
        teal: { 100: '#CCFBF1', 500: '#14B8A6', 800: '#115E59' }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', '"Noto Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
