/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Neutral surfaces — warm gray so white cards read as lifted, not flat.
        page: '#f4f4f2',
        surface: '#ffffff',
        sunken: '#ececeb',
        line: '#e4e4e1',
        ink: { DEFAULT: '#14140f', soft: '#52514e', mute: '#86857f' },
        // Brand + data colours come from one validated ramp (see lib/palette.ts).
        brand: {
          50: '#eef5fe',
          100: '#cde2fb',
          200: '#9ec5f4',
          300: '#6da7ec',
          400: '#3987e5',
          500: '#2a78d6',
          600: '#256abf',
          700: '#1c5cab',
          800: '#184f95',
          900: '#104281',
        },
        correct: '#1baf7a',
        wrong: '#e34948',
        amber: '#eda100',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: { xl: '0.875rem', '2xl': '1.125rem', '3xl': '1.5rem' },
      boxShadow: {
        card: '0 1px 2px rgba(20,20,15,.05), 0 8px 24px -12px rgba(20,20,15,.14)',
        lift: '0 2px 4px rgba(20,20,15,.06), 0 18px 40px -16px rgba(20,20,15,.22)',
        tile: '0 3px 0 rgba(0,0,0,.16)',
      },
      keyframes: {
        'fade-up': { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'none' } },
        'pop-in': { '0%': { opacity: '0', transform: 'scale(.9)' }, '70%': { transform: 'scale(1.03)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        'grow-bar': { '0%': { transform: 'scaleY(0)' }, '100%': { transform: 'scaleY(1)' } },
        shake: { '10%,90%': { transform: 'translateX(-2px)' }, '30%,70%': { transform: 'translateX(4px)' }, '50%': { transform: 'translateX(-4px)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        'pulse-ring': { '0%': { boxShadow: '0 0 0 0 rgba(42,120,214,.35)' }, '100%': { boxShadow: '0 0 0 18px rgba(42,120,214,0)' } },
      },
      animation: {
        'fade-up': 'fade-up .4s cubic-bezier(.2,.7,.3,1) both',
        'pop-in': 'pop-in .35s cubic-bezier(.2,.8,.3,1) both',
        'grow-bar': 'grow-bar .6s cubic-bezier(.2,.8,.3,1) both',
        shake: 'shake .5s both',
        float: 'float 4s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 1.6s ease-out infinite',
      },
    },
  },
  plugins: [],
};
