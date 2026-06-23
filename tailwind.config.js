/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#06080d',
          800: '#0d1117',
          700: '#161b22',
          600: '#21262d',
          500: '#30363d',
          400: '#484f58',
          300: '#656d76',
        },
        brand: {
          blue:   '#4f8ef7',
          purple: '#a855f7',
          green:  '#22c55e',
          amber:  '#f59e0b',
          rose:   '#f43f5e',
          cyan:   '#06b6d4',
        },
        phase: {
          direction: '#4f8ef7',
          diagnosis: '#22c55e',
          choice:    '#a855f7',
          execution: '#f59e0b',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
