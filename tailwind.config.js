module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,ts,jsx,tsx}'],
  theme: {
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
        rotate: 'spin 2s linear infinite',
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
  plugins: [],
};
