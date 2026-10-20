/** @type {import('tailwindcss').Config} */

function withOpacity(variable) {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `color-mix(in srgb, var(${variable}) calc(${opacityValue} * 100%), transparent)`;
    }
    return `var(${variable})`;
  };
}

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: withOpacity('--background'),
        surface: withOpacity('--surface'),
        'surface-dim': withOpacity('--surface-dim'),
        'surface-bright': withOpacity('--surface-bright'),
        'surface-container-lowest': withOpacity('--surface-container-lowest'),
        'surface-container-low': withOpacity('--surface-container-low'),
        'surface-container': withOpacity('--surface-container'),
        'surface-container-high': withOpacity('--surface-container-high'),
        'surface-container-highest': withOpacity('--surface-container-highest'),
        'surface-variant': withOpacity('--surface-container-highest'),
        'on-surface': withOpacity('--on-surface'),
        'on-surface-variant': withOpacity('--on-surface-variant'),
        'on-background': withOpacity('--on-surface'),
        secondary: withOpacity('--secondary'),
        'secondary-container': withOpacity('--surface-container-high'),
        'on-secondary': withOpacity('--on-surface'),
        'on-secondary-container': withOpacity('--secondary'),
        outline: withOpacity('--outline'),
        'outline-variant': withOpacity('--outline-variant'),
        primary: withOpacity('--primary'),
        'on-primary': withOpacity('--on-primary'),
        'primary-container': withOpacity('--primary-container'),
        'on-primary-container': withOpacity('--on-primary-container'),
        'primary-fixed': withOpacity('--primary-container'),
        'primary-fixed-dim': withOpacity('--primary'),
        'status-critical': withOpacity('--error'),
        'status-warning': withOpacity('--primary-container'),
        'status-healthy': withOpacity('--status-healthy'),
        error: withOpacity('--error'),
        'on-error': withOpacity('--on-primary'),
        'error-container': withOpacity('--error-container'),
      },
      borderColor: ({ theme }) => ({
        ...theme('colors'),
        DEFAULT: 'var(--outline-variant)',
      }),
      borderRadius: {
        DEFAULT: '0.25rem',
        sm: '0.25rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        full: '9999px',
      },
      spacing: {
        unit: '4px',
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        'section-desktop': '96px',
        'section-mobile': '48px',
        'max-width': '1200px',
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        display: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        'label-mono': ['JetBrains Mono', 'monospace'],
        'body-md': ['Inter', 'sans-serif'],
        'body-lg': ['Inter', 'sans-serif'],
        'headline-lg': ['Space Grotesk', 'sans-serif'],
        'headline-md': ['Space Grotesk', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
