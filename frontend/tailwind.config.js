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
          950: '#00153D',
          900: '#00215E', // Rich navy blue matching the reference design
          800: '#002F87',
          700: '#003EB0',
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
