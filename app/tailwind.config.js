/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        appbg: '#121212',
        surface: '#1E1E1E',
        surfacehover: '#292929',
        hairline: '#333333',
        ink: '#D1D5DB',
        muted: '#9CA3AF',
        brandteal: '#207781',
        fabpink: '#EC1D8B',
      },
    },
  },
  plugins: [],
}
