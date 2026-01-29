/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#fea3a6',
          50: '#fff7f7',
          100: '#ffeff0',
          200: '#ffd6d8',
          300: '#ffbdc0',
          400: '#fea3a6',
          500: '#fd898d',
          600: '#e47b7f',
          700: '#be676a',
          800: '#985255',
          900: '#7c4346',
        },
        primary: {
          DEFAULT: '#fea3a6',
          50: '#fff7f7',
          100: '#ffeff0',
          200: '#ffd6d8',
          300: '#ffbdc0',
          400: '#fea3a6',
          500: '#fd898d',
          600: '#e47b7f',
          700: '#be676a',
          800: '#985255',
          900: '#7c4346',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
