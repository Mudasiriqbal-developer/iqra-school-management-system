/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#00153D',
          900: '#00215E', // Rich navy blue matching the reference design
          800: '#002F87',
          700: '#003EB0',
        },
        status: {
          active: '#16A34A',   // green
          pending: '#D97706',  // amber
          danger: '#DC2626',   // red
        },
        primary: {
          DEFAULT: '#4F6EF7',
          hover: '#3B54D6',
        },
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
        background: '#F9FAFB',
        surface: '#FFFFFF',
        border: '#E5E7EB',
        text: {
          primary: '#111827',
          secondary: '#6B7280',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Poppins', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
        btn: '8px',
        input: '8px',
      },
      boxShadow: {
        subtle: '0 1px 3px rgba(0,0,0,0.1)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', // Floating shadow
      }
    },
  },
  plugins: [],
}
