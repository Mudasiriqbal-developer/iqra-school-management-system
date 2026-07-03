/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#0F1A45',
          900: '#1E2A5E',
          800: '#1E3A8A',
          700: '#2846A3',
        },
        status: {
          active: '#16A34A',   // green
          pending: '#D97706',  // amber
          danger: '#DC2626',   // red
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
