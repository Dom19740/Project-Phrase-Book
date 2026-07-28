/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        appbg: '#0A0A0A',
        surface: '#171717',
        surfacehover: '#1f1f1f',
        hairline: '#2A2A2A',
        ink: '#D1D5DB',
        muted: '#9CA3AF',
        brandteal: '#207781',
        fabpink: '#EC1D8B',
      },
    },
  },
  plugins: [],
}
