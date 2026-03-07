/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        accent: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        gray: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0a0a0a',
        },
        card: 'rgb(var(--card-bg) / <alpha-value>)',
        background: 'rgb(var(--background-rgb) / <alpha-value>)',
        foreground: 'rgb(var(--foreground-rgb) / <alpha-value>)',
      },
      backgroundColor: {
        card: 'rgb(var(--card-bg) / <alpha-value>)',
        background: 'rgb(var(--background-rgb) / <alpha-value>)',
        foreground: 'rgb(var(--foreground-rgb) / <alpha-value>)',
      },
      textColor: {
        background: 'rgb(var(--background-rgb) / <alpha-value>)',
        foreground: 'rgb(var(--foreground-rgb) / <alpha-value>)',
      },
      animation: {
        'elevator-in': 'elevatorIn 0.4s ease-out',
        'elevator-in-delay-1': 'elevatorIn 0.4s ease-out 0.05s backwards',
        'elevator-in-delay-2': 'elevatorIn 0.4s ease-out 0.1s backwards',
        'elevator-in-delay-3': 'elevatorIn 0.4s ease-out 0.15s backwards',
        'elevator-in-delay-4': 'elevatorIn 0.4s ease-out 0.2s backwards',
        'elevator-in-delay-5': 'elevatorIn 0.4s ease-out 0.25s backwards',
        'fade-slide': 'fadeSlide 0.5s ease-out',
        'activity-in': 'activityIn 0.4s ease-out forwards',
        'activity-in-1': 'activityIn 0.4s ease-out 0.1s backwards',
        'activity-in-2': 'activityIn 0.4s ease-out 0.2s backwards',
        'activity-in-3': 'activityIn 0.4s ease-out 0.3s backwards',
      },
      keyframes: {
        elevatorIn: {
          '0%': {
            opacity: '0',
            transform: 'translateY(15px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        fadeSlide: {
          '0%': {
            opacity: '0',
            transform: 'translateX(-15px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateX(0)',
          },
        },
        activityIn: {
          '0%': {
            opacity: '0',
            transform: 'translateX(15px) scale(0.98)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateX(0) scale(1)',
          },
        },
      },
    },
  },
  plugins: [],
}