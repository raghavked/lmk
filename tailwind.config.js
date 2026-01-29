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
        // Custom Dark Theme Palette
        'background-primary': '#121212',
        'background-secondary': '#1E1E1E',
        'background-tertiary': '#282828',
        'border-color': '#333333',
        'text-primary': '#E0E0E0',
        'text-secondary': '#A0A0A0',
        // Coral Accent
        coral: {
          DEFAULT: '#fea4a7', // The main accent color
          light: '#ffc1c3',
          dark: '#e47b7f',
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
