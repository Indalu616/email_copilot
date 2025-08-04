/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,jsx,ts,tsx,html}",
    "./src/popup/**/*.{js,jsx,html}",
  ],
  theme: {
    extend: {
      colors: {
        'extension-primary': '#4285f4',
        'extension-secondary': '#34a853',
        'extension-accent': '#fbbc04',
        'extension-danger': '#ea4335',
        'ghost-text': '#9ca3af',
        'ghost-bg': 'rgba(156, 163, 175, 0.1)'
      },
      fontFamily: {
        'extension': ['Inter', 'system-ui', 'sans-serif']
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-subtle': 'pulseSubtle 2s infinite'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '0.8' },
          '50%': { opacity: '0.4' }
        }
      }
    },
  },
  plugins: [],
}