/** @type {import('tailwindcss').Config} */
module.exports = {
  plugins: [require('@headlessui/tailwindcss'), require('@tailwindcss/typography'), require('@headlessui/tailwindcss')],
  content: ['./app/**/*.tsx', './pages/**/*.tsx', './lib/**/*.tsx'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {},
  },
}
