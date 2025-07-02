/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './public/index.html',
    './public/post.html',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#10B981', // emerald-600 from prompt
        },
        // Extending the default palette as requested
        emerald: {
          100: '#D1FAE5', // For hover ring
          400: '#34D399',
          700: '#047857', // For button hover
          900: '#064E3B',
        },
        lime: {
          100: '#ECFCCB', // For tag background
          500: '#84CC16',
          800: '#3F6212', // For tag text
        },
        teal: {
          100: '#CCFBF1', // For tag background
          500: '#14B8A6',
          800: '#115E59', // For tag text
        },
        sky: {
          100: '#E0F2FE', // For tag background
          500: '#0EA5E9',
          800: '#075985', // For tag text
        },
        slate: {
          50: '#F9FAFB',  // Background
          200: '#E5E7EB', // Borders/cards
          300: '#D1D5DB', // Form inputs
        },
        gray: {
          500: '#6B7280', // Text
          600: '#4B5563', // Text
          800: '#1F2937', // Text
          900: '#111827', // Headings
        }
      },
      fontFamily: {
        // Ensuring system font stack is used, matching the prompt
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', '"Noto Sans"', 'sans-serif', '"Apple Color Emoji"', '"Segoe UI Emoji"', '"Segoe UI Symbol"', '"Noto Color Emoji"'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
