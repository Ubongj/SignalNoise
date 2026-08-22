/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Fhenix surface stack (deep navy-teal ground → elevated teal)
        bg: {
          DEFAULT: '#001623',   // ground / "the void"
          lowest: '#000e18',    // side rails, lowest containers
          surface: '#0a2634',   // surface-container-low
          card: '#0e2c3b',      // surface-container
          elevated: '#143543',  // surface-container-high
          bright: '#1c4152',
        },
        // Fhenix hairline outlines
        outline: {
          DEFAULT: '#33454f',   // subtle 1px borders
          strong: '#5b6b74',
        },
        // On-surface text
        ink: {
          DEFAULT: '#e8eff2',
          variant: '#9fb0b8',
        },
        // Primary brand = Fhenix cyan
        primary: {
          DEFAULT: '#0ad9dc',
          dim: '#08b7ba',
        },
        accent: {
          red: '#ff6b8a',
          blue: '#02c8ff',
          green: '#0ad9dc',
          yellow: '#fbbf24',
          purple: '#a78bfa',
        },
        team: {
          a: '#ff6b8a',
          b: '#02c8ff',
        },
      },
      // Fhenix corners are sharp — collapse the whole radius scale to 0,
      // keeping only `full` for genuinely circular elements (dots, avatars).
      borderRadius: {
        none: '0',
        sm: '0',
        DEFAULT: '0',
        md: '0',
        lg: '0',
        xl: '0',
        '2xl': '0',
        '3xl': '0',
        full: '9999px',
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
