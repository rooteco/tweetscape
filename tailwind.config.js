const colors = require('tailwindcss/colors');

module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,ts,jsx,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      black: colors.black,
      white: colors.white,
      gray: colors.zinc,
      sky: colors.sky,
    },
    fontFamily: {
      sans: [
        'Inter',
        '-apple-system',
        'BlinkMacSystemFont',
        'Segoe UI',
        'Roboto',
        'Oxygen',
        'Ubuntu',
        'Cantarell',
        'Fira Sans',
        'Droid Sans',
        'Helvetica Neue',
        'sans-serif',
      ],
    },
    extend: {
      animation: {
        'rotate': 'spin 2s linear infinite',
        'sparkle-spin': 'sparkle-spin 1s linear',
        'sparkle-ping': 'sparkle-ping 700ms forwards',
      },
      keyframes: {
        'sparkle-spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(180deg)' },
        },
        'sparkle-ping': {
          '0%': { transform: 'scale(0)' },
          '50%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(0)' },
        },
      },
      colors: {
        red: {
          550: 'rgb(249,24,128)',
          50: 'rgba(249,24,128,0.1)',
        },
        green: {
          550: 'rgb(0,186,124)',
          50: 'rgba(0,186,124,0.1)',
        },
        blue: {
          550: 'rgb(29,155,240)',
          50: 'rgba(29,155,240,0.1)',
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
