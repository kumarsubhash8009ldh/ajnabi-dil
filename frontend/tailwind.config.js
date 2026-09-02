/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f3ff',
          100: '#edd8ff',
          200: '#d9b3ff',
          300: '#bf80ff',
          400: '#a64dff',
          500: '#8c1aff', // main brand color (purple/indigo shade)
          600: '#7300e6',
          700: '#5900b3',
          800: '#400080',
          900: '#26004c',
        }
      }
    },
  },
  plugins: [],
}
