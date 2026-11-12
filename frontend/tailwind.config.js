/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Semantic token mappings from CSS variables
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          50:  'rgb(var(--bg) / <alpha-value>)',
          100: 'rgb(var(--surface-2) / <alpha-value>)',
          200: 'rgb(var(--border) / <alpha-value>)',
          300: '#D4D4D8',
        },
        'surface-2': 'rgb(var(--surface-2) / <alpha-value>)',
        'surface-hover': 'rgb(var(--surface-hover) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        'border-subtle': 'rgb(var(--border-subtle) / <alpha-value>)',
        text: {
          DEFAULT: 'rgb(var(--text) / <alpha-value>)',
          muted: 'rgb(var(--text-muted) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          hover: 'rgb(var(--accent-hover) / <alpha-value>)',
          tint: 'rgb(var(--accent-tint) / <alpha-value>)',
          ring: 'rgb(var(--accent-ring) / <alpha-value>)',
        },
        // Deep cyan printer-ink scale replacing default blue
        primary: {
          50:  '#ECFEFF',
          100: '#CFFAFE',
          200: '#A5F3FC',
          300: '#67E8F9',
          400: '#22D3EE',
          500: '#06B6D4',
          600: '#0E7490', // Deep cyan primary
          700: '#155E75', // Deep cyan hover
          800: '#164E63',
          900: '#155E75',
          950: '#083344',
        },
        brand: {
          50:  '#ECFEFF',
          100: '#CFFAFE',
          200: '#A5F3FC',
          300: '#67E8F9',
          400: '#22D3EE',
          500: '#06B6D4',
          600: '#0E7490',
          700: '#155E75',
          800: '#164E63',
          900: '#155E75',
          950: '#083344',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '8px',
        sm: '6px',
        md: '8px',
        lg: '8px',     // 8px controls
        xl: '12px',    // 12px cards
        '2xl': '12px', // Normalize legacy rounded-2xl to 12px cards
      },
      boxShadow: {
        xs: 'var(--shadow-resting, 0 1px 2px 0 rgba(0, 0, 0, 0.04))',
        sm: 'var(--shadow-resting, 0 1px 2px 0 rgba(0, 0, 0, 0.04))',
        md: 'var(--shadow-raised, 0 4px 10px -2px rgba(0, 0, 0, 0.06))',
        lg: 'var(--shadow-modal, 0 14px 32px -4px rgba(0, 0, 0, 0.12))',
        xl: 'var(--shadow-modal, 0 14px 32px -4px rgba(0, 0, 0, 0.12))',
        '2xl': 'var(--shadow-modal, 0 14px 32px -4px rgba(0, 0, 0, 0.12))',
        card: 'var(--shadow-resting, 0 1px 3px 0 rgba(0, 0, 0, 0.03))',
        'card-hover': 'var(--shadow-raised, 0 4px 8px -1px rgba(0, 0, 0, 0.06))',
        modal: 'var(--shadow-modal, 0 14px 32px -4px rgba(0, 0, 0, 0.12))',
      },
      transitionDuration: {
        DEFAULT: '150ms',
        150: '150ms',
        200: '200ms',
      },
    },
  },
  plugins: [],
}
