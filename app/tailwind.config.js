/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        appbg: 'var(--color-appbg)',
        surface: 'var(--color-surface)',
        surfacehover: 'var(--color-surfacehover)',
        hairline: 'var(--color-hairline)',
        ink: 'var(--color-ink)',
        muted: 'var(--color-muted)',
        brandteal: '#207781',
        fabpink: '#EC1D8B',
      },
    },
  },
  plugins: [],
}
