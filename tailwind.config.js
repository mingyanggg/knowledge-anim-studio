/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#00d4ff',
        secondary: '#7c3aed',
        background: '#0f0f1a',
        surface: '#1a1a2e',
        border: '#2a2a4a',
      },
    },
  },
  plugins: [],
}
