/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Cyberpunk-terminal surface stack (deep navy void → elevated slate)
        bg: {
          DEFAULT: '#0b1323',   // background / "the void"
          lowest: '#060e1d',    // side rails, lowest containers
          surface: '#131c2b',   // surface-container-low
          card: '#18202f',      // surface-container
          elevated: '#222a3a',  // surface-container-high
          bright: '#31394a',
        },
        // Terminal outlines
        outline: {
          DEFAULT: '#3e484f',   // subtle 1px borders
          strong: '#87929a',
        },
        // On-surface text
        ink: {
          DEFAULT: '#dbe2f8',
          variant: '#bdc8d1',
        },
        // Primary brand = green
        primary: {
          DEFAULT: '#4ade80',
          dim: '#22c55e',
        },
        accent: {
          red: '#f43f5e',
          blue: '#38bdf8',
          green: '#4ade80',
          yellow: '#fbbf24',
          purple: '#a78bfa',
        },
        team: {
          a: '#f43f5e',
          b: '#38bdf8',
        },
      },
      fontFamily: {
        sans: ['var(--font-space)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        terminal: '0.05em',
        wider2: '0.2em',
      },
      animation: {
        'pulse-fast': 'pulse 0.8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.4s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'flip': 'flip 0.6s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: 0 },
          '100%': { transform: 'scale(1)', opacity: 1 },
        },
        flip: {
          '0%': { transform: 'rotateY(90deg)', opacity: 0 },
          '100%': { transform: 'rotateY(0)', opacity: 1 },
        },
      },
    },
  },
  plugins: [],
};
