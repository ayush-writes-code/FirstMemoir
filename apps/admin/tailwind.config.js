/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: '#E8620A',
        'brand-pressed': '#d05809',
      },
    },
  },
  plugins: [],
}

