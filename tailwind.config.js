/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-900': '#0E1015',
        'bg-800': '#141720',
        'bg-700': '#1B1F29',
        'border-600': '#262B37',
        'text-100': '#E5E7EB',
        'text-200': '#9CA3AF',
        'text-300': '#6B7280',
        'brand-500': '#2DD4BF',
        'brand-600': '#14B8A6',
        'brand-700': '#0D9488',
        'accent-amber': '#F59E0B',
        'state-success': '#22C55E',
        'state-error': '#EF4444',
        'state-info': '#0EA5E9',
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        full: '999px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        1: '0 1px 2px rgba(0,0,0,.32)',
        2: '0 2px 4px rgba(0,0,0,.36)',
        3: '0 4px 12px rgba(0,0,0,.46)',
        4: '0 8px 24px rgba(0,0,0,.56)',
      },
      spacing: {
        4: '4px',
        8: '8px',
        12: '12px',
        16: '16px',
        20: '20px',
        24: '24px',
        32: '32px',
        40: '40px',
        56: '56px',
        64: '64px',
      },
    },
  },
  plugins: [],
}; 