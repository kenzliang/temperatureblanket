/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'media', // use 'class' if you want manual toggling instead of system preference
  theme: {
    extend: {
      colors: {
        // You can add custom brand colors if needed
      },
    },
  },
  plugins: [],
}
