import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef7f2',
          100: '#d6ebe0',
          200: '#aed7c1',
          300: '#7dbd9c',
          400: '#4e9f78',
          500: '#2f855a',
          600: '#256b49',
          700: '#1e553b',
          800: '#18432f',
          900: '#123425',
        },
        gold: {
          400: '#d4af62',
          500: '#c19a45',
          600: '#a07f34',
        },
      },
      fontFamily: {
        sans: ['var(--font-arabic)', 'Tahoma', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,.06), 0 8px 24px -12px rgba(16,24,40,.18)',
      },
    },
  },
  plugins: [],
};

export default config;
