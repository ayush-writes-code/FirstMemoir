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
        'brand': '#BE4C06',
        'brand-pressed': '#983B04',
        'brand-tint': '#FAF0EA',
        'ink': '#222222',
        'ink-deep': '#141414',
        'body': '#3f3f3f',
        'muted': '#595959',
        'muted-soft': '#5e5e5e',
        'canvas': '#ffffff',
        'canvas-warm': '#FAF8F5',
        'canvas-sand': '#F4EFEB',
        'surface-soft': '#f6f6f6',
        'surface-cream': '#fdf6e8',
        'hairline': '#e6e6e6',
        'editorial-border': '#EAE5DC',
        'border-strong': '#d0d0d0',
        'success': '#258635',
        'error': '#b3261e',
      },
      fontFamily: {
        sans: ['var(--font-inter)', ...defaultTheme.fontFamily.sans],
        serif: ['var(--font-playfair)', ...defaultTheme.fontFamily.serif],
      },
      borderRadius: {
        'card': '8px',
        'modal': '12px',
        'pill': '9999px',
      },
      boxShadow: {
        'frame': '0 30px 70px -15px rgba(20, 15, 10, 0.22), 0 15px 30px -5px rgba(20, 15, 10, 0.12)',
        'gallery': '0 20px 50px -12px rgba(20, 15, 10, 0.12), 0 8px 24px -4px rgba(20, 15, 10, 0.06)',
      },
      maxWidth: {
        'content': '1296px',
      },
    },
  },
  plugins: [],
};
