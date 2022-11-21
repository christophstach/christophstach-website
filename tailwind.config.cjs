/* eslint-disable no-undef */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.tsx'],
  darkMode: ['class', '[data-theme="dark"]'],
  plugins: [require('@tailwindcss/typography')],
}
