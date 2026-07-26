/** @type {import('tailwindcss').Config} */
import defaultTheme from 'tailwindcss/defaultTheme';

export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'brand': '#E8620A',
        'brand-pressed': '#C4500A',
        'ink': '#222222',
        'body': '#3f3f3f',
        'muted': '#595959',
        'muted-soft': '#757575',
        'canvas': '#ffffff',
        'surface-soft': '#f6f6f6',
        'surface-cream': '#fdf6e8',
        'hairline': '#e6e6e6',
        'border-strong': '#d0d0d0',
        'success': '#258635',
        'error': '#b3261e',
      },
      fontFamily: {
        sans: ['Inter', 'var(--font-inter)', ...defaultTheme.fontFamily.sans],
      },
      borderRadius: {
        'card': '8px',
        'modal': '12px',
        'pill': '9999px',
      },
      maxWidth: {
        'content': '1296px',
      },
    },
  },
  plugins: [],
};
