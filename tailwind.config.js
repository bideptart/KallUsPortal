import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  // Light-theme only. We keep the class strategy (not media) so existing
  // `dark:xxx` utility classes scattered across components never fire —
  // nothing in the app adds the `.dark` class to <html> anymore.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: { 950: '#0b0b0c', 900: '#171717', 800: '#262626', 700: '#404040' },
        line: '#e5e7eb',
        teal: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
        sky: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          950: '#083344',
        },
        mute: '#6b7280',
      },
      // Resolve Tailwind's font-sans (the default applied via Preflight) so
      // utility-styled components match the global CSS.
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['DM Serif Display', 'ui-serif', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [
    // @tailwindcss/typography — the `prose` class used on /terms and /privacy.
    typography,
  ],
};
