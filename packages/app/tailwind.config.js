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
                background: withOpacity('--bg'),
                surface: withOpacity('--surface'),
                'surface-dim': withOpacity('--surface'),
                'surface-bright': withOpacity('--surface-container-highest'),
                'surface-container-lowest': withOpacity('--surface-container-lowest'),
                'surface-container-low': withOpacity('--surface-low'),
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
                'status-critical': withOpacity('--status-critical'),
                'status-warning': withOpacity('--status-warning'),
                'status-healthy': withOpacity('--status-healthy'),
                'status-info': withOpacity('--status-info'),
                'status-low-confidence': withOpacity('--status-low-confidence'),
                error: withOpacity('--status-critical'),
                'on-error': withOpacity('--on-primary'),
                'error-container': withOpacity('--critical-fill'),
                'on-error-container': withOpacity('--status-critical'),
            },
            borderColor: ({ theme }) => ({
                ...theme('colors'),
                DEFAULT: 'var(--outline)',
            }),
            borderRadius: {
                DEFAULT: '0.25rem',
                lg: '0.5rem',
                xl: '0.75rem',
                full: '9999px',
            },
            spacing: {
                'section-mobile': '48px',
                xs: '4px',
                md: '16px',
                unit: '4px',
                'section-desktop': '96px',
                'max-width': '1200px',
                lg: '24px',
                sm: '8px',
                xl: '32px',
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
                mono: [
                    'JetBrains Mono',
                    'ui-monospace',
                    'SFMono-Regular',
                    'Menlo',
                    'Monaco',
                    'Consolas',
                    'monospace',
                ],
                display: ['Space Grotesk', 'sans-serif'],
            },
        },
    },
    plugins: [],
};
