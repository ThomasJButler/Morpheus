import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        matrix: {
          black: '#0a0a0a',
          green: '#00ff00',
          'green-dim': '#00cc00',
          cyan: '#00ffff',
          white: '#e0e0e0',
        },
        glass: {
          bg: 'rgba(0, 255, 0, 0.03)',
          border: 'rgba(0, 255, 0, 0.2)',
        },

        // ===== v2 redesign tokens (REDESIGN_V2) =====
        // Backed by CSS custom properties defined in src/app/globals.css.
        // Naming groups keep legacy + v2 separable.
        accent: {
          DEFAULT: 'var(--accent)',
          bright: 'var(--accent-bright)',
          dim: 'var(--accent-dim)',
          faint: 'var(--accent-faint)',
        },
        surface: {
          base: 'var(--bg-base)',
          elev: 'var(--bg-elev)',
          panel: 'var(--bg-panel)',
          input: 'var(--bg-input)',
          card: 'var(--bg-card)',
          'card-hover': 'var(--bg-card-hover)',
          overlay: 'var(--bg-overlay)',
        },
        fg: {
          primary: 'var(--fg-primary)',
          secondary: 'var(--fg-secondary)',
          muted: 'var(--fg-muted)',
          dim: 'var(--fg-dim)',
          faint: 'var(--fg-faint)',
        },
        edge: {
          faint: 'var(--border-faint)',
          subtle: 'var(--border-subtle)',
          DEFAULT: 'var(--border-default)',
          strong: 'var(--border-strong)',
          focus: 'var(--border-focus)',
        },
        mode: {
          cyan: 'var(--v2-cyan)',
          'cyan-dim': 'var(--v2-cyan-dim)',
          amber: 'var(--v2-amber)',
          'amber-dim': 'var(--v2-amber-dim)',
          purple: 'var(--v2-purple)',
          red: 'var(--v2-red)',
          'red-dim': 'var(--v2-red-dim)',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        // v2: Geist for body text in new components. Falls through to Inter
        // if the geist font fails to load. Apply via className="font-geist".
        geist: ['var(--font-geist-sans)', 'Geist', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        // v2 radius tokens — match prototype shadcn-leaning scale
        'v2-xs': 'var(--r-xs)',
        'v2-sm': 'var(--r-sm)',
        'v2-md': 'var(--r-md)',
        'v2-lg': 'var(--r-lg)',
        'v2-xl': 'var(--r-xl)',
      },
      boxShadow: {
        // v2 glow shadows
        'glow-sm': 'var(--glow-sm)',
        'glow-md': 'var(--glow-md)',
        'glow-lg': 'var(--glow-lg)',
      },
      animation: {
        'matrix-rain': 'matrix-rain 20s linear infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
      },
      keyframes: {
        'matrix-rain': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'glow-pulse': {
          '0%, 100%': {
            boxShadow: '0 0 20px rgba(0, 255, 0, 0.5)',
          },
          '50%': {
            boxShadow: '0 0 30px rgba(0, 255, 0, 0.8)',
          },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': {
            transform: 'translateY(10px)',
            opacity: '0',
          },
          '100%': {
            transform: 'translateY(0)',
            opacity: '1',
          },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      transitionDuration: {
        '250': '250ms',
        '400': '400ms',
      },
    },
  },
  plugins: [],
}

export default config