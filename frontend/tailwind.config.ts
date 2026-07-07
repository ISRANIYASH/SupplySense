import type { Config } from 'tailwindcss'
import { fontFamily } from 'tailwindcss/defaultTheme'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ─── Core Brand Colors ───────────────────────────────
        background: '#0A0F1E',
        surface: {
          DEFAULT: '#111827',
          2: '#1C2537',
          3: '#243048',
        },
        border: {
          DEFAULT: '#1E2D45',
          subtle: '#162033',
          strong: '#2A3F5F',
        },
        // ─── Accent Colors ────────────────────────────────────
        accent: {
          blue: {
            DEFAULT: '#3B8EE8',
            50: 'rgba(59,142,232,0.05)',
            100: 'rgba(59,142,232,0.1)',
            200: 'rgba(59,142,232,0.2)',
            400: '#6AABEE',
            600: '#2572C8',
          },
          teal: {
            DEFAULT: '#00D4AA',
            50: 'rgba(0,212,170,0.05)',
            100: 'rgba(0,212,170,0.1)',
            200: 'rgba(0,212,170,0.2)',
            600: '#00A888',
          },
        },
        // ─── Semantic Colors ──────────────────────────────────
        warning: {
          DEFAULT: '#F59E0B',
          50: 'rgba(245,158,11,0.1)',
          600: '#D97706',
        },
        danger: {
          DEFAULT: '#EF4444',
          50: 'rgba(239,68,68,0.1)',
          600: '#DC2626',
        },
        success: {
          DEFAULT: '#10B981',
          50: 'rgba(16,185,129,0.1)',
          600: '#059669',
        },
        info: {
          DEFAULT: '#3B8EE8',
          50: 'rgba(59,142,232,0.1)',
        },
        // ─── Text Colors ─────────────────────────────────────
        text: {
          primary: '#F1F5F9',
          secondary: '#CBD5E1',
          muted: '#64748B',
          disabled: '#374151',
        },
        // ─── Glass Colors ─────────────────────────────────────
        glass: {
          bg: 'rgba(17,24,39,0.7)',
          border: 'rgba(59,142,232,0.15)',
          hover: 'rgba(59,142,232,0.08)',
        },
      },
      fontFamily: {
        sans: ['Inter', ...fontFamily.sans],
        mono: ['JetBrains Mono', 'Fira Code', ...fontFamily.mono],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
      },
      spacing: {
        sidebar: '240px',
        'sidebar-collapsed': '64px',
        topbar: '60px',
      },
      borderRadius: {
        DEFAULT: '8px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
        full: '9999px',
      },
      boxShadow: {
        // Glow effects for accent elements
        'glow-blue': '0 0 20px rgba(59,142,232,0.3), 0 0 40px rgba(59,142,232,0.15)',
        'glow-blue-sm': '0 0 10px rgba(59,142,232,0.25)',
        'glow-teal': '0 0 20px rgba(0,212,170,0.3), 0 0 40px rgba(0,212,170,0.15)',
        'glow-teal-sm': '0 0 10px rgba(0,212,170,0.2)',
        'glow-red': '0 0 20px rgba(239,68,68,0.3)',
        'glow-amber': '0 0 20px rgba(245,158,11,0.3)',
        // Glass card shadows
        glass: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        'glass-sm': '0 4px 16px rgba(0,0,0,0.3)',
        'glass-lg': '0 16px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
        // Card hover
        'card-hover': '0 8px 32px rgba(59,142,232,0.15)',
        // Inner glow
        inner: 'inset 0 2px 4px rgba(0,0,0,0.3)',
      },
      backgroundImage: {
        // Gradient overlays
        'gradient-dark': 'linear-gradient(180deg, #0A0F1E 0%, #0D1425 100%)',
        'gradient-surface': 'linear-gradient(135deg, #111827 0%, #1C2537 100%)',
        'gradient-blue': 'linear-gradient(135deg, #3B8EE8 0%, #2572C8 100%)',
        'gradient-teal': 'linear-gradient(135deg, #00D4AA 0%, #00A888 100%)',
        'gradient-danger': 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
        // Subtle patterns
        'grid-pattern':
          'linear-gradient(rgba(59,142,232,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,142,232,0.03) 1px, transparent 1px)',
        // Shimmer for loading
        shimmer:
          'linear-gradient(90deg, transparent 0%, rgba(59,142,232,0.05) 50%, transparent 100%)',
      },
      backgroundSize: {
        'grid-sm': '20px 20px',
        'grid-md': '40px 40px',
        'grid-lg': '80px 80px',
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        DEFAULT: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
      },
      animation: {
        // Status indicators
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        // Entrance animations
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'fade-in': 'fadeIn 0.4s ease-out',
        'fade-in-slow': 'fadeIn 0.8s ease-out',
        // Loading
        shimmer: 'shimmer 2s linear infinite',
        'spin-slow': 'spin 3s linear infinite',
        // Effects
        float: 'float 6s ease-in-out infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'border-flow': 'borderFlow 3s linear infinite',
        // Data updates
        'count-up': 'countUp 0.6s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-16px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(16px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(59,142,232,0.2)' },
          '50%': { boxShadow: '0 0 25px rgba(59,142,232,0.5)' },
        },
        borderFlow: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '100% 50%' },
        },
        countUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      transitionDuration: {
        DEFAULT: '200ms',
        fast: '100ms',
        slow: '400ms',
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
        'spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },
      screens: {
        xs: '480px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
        '3xl': '1920px',
      },
    },
  },
  plugins: [],
}

export default config
