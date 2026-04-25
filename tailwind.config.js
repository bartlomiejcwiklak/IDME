/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['Space Grotesk', 'system-ui', 'sans-serif'],
        display: ['Bebas Neue', 'system-ui', 'sans-serif'],
        mono:    ['Space Mono', 'monospace'],
      },
      colors: {
        // #d9ff42 neon lime — the ONLY accent
        acid: {
          DEFAULT: '#d9ff42',
          dim:     '#a8c700',
          muted:   '#3d4500',
          bg:      '#0d1100',
        },
        brand: {
          400: '#d9ff42',
          500: '#d9ff42',
          600: '#d9ff42',
          700: '#d9ff42',
          950: '#0d1100',
        },
      },
      borderRadius: {
        // Brutalist: everything nearly square
        DEFAULT: '0px',
        sm:  '0px',
        md:  '2px',
        lg:  '2px',
        xl:  '2px',
        '2xl': '3px',
        full: '9999px', // kept only for the play button
      },
      boxShadow: {
        acid:   '4px 4px 0px #d9ff42',
        'acid-sm': '2px 2px 0px #d9ff42',
        'acid-lg': '6px 6px 0px #d9ff42',
        hard:   '4px 4px 0px #ffffff',
        'hard-sm': '2px 2px 0px #ffffff',
      },
      animation: {
        'slide-up':  'slideUp 0.2s ease-out',
        'fade-in':   'fadeIn 0.15s ease-out',
        'blink':     'blink 1s step-end infinite',
        'bounce-in': 'bounceIn 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97)',
      },
      keyframes: {
        slideUp: {
          '0%':   { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0' },
        },
        bounceIn: {
          '0%, 20%, 53%, 80%, 100%': { transform: 'translate3d(0,0,0)' },
          '40%, 43%': { transform: 'translate3d(0,-10px,0)' },
          '70%':      { transform: 'translate3d(0,-5px,0)' },
          '90%':      { transform: 'translate3d(0,-2px,0)' },
        },
      },
    },
  },
  plugins: [],
}
