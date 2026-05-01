/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#faf8f5',
        surface: '#ffffff',
        border: '#e8e4df',
        text: '#3d3d3d',
        muted: '#7a7a7a',
        core: '#7bb38a',
        specialization: '#f3a683',
        general: '#a8c8e0',
        locked: '#d1d1d1',
        available: '#7bb38a',
        inProgress: '#f3a683',
        completed: '#5cb85c',
        light: {
          bg: '#faf8f5',
          surface: '#ffffff',
          border: '#e8e4df',
          text: '#3d3d3d',
          muted: '#7a7a7a',
        },
        skill: {
          core: '#7bb38a',
          specialization: '#f3a683',
          general: '#a8c8e0',
        },
        status: {
          inProgress: '#f3a683',
          completed: '#5cb85c',
        },
        dark: {
          bg: '#1a1a2e',
          surface: '#16213e',
          border: '#2a2a4a',
          text: '#e0e0e0',
          muted: '#8888aa',
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'breathe': 'breathe 2s ease-in-out infinite',
        'spin': 'spin 1s linear infinite',
        'scale-in': 'scale-in 0.2s ease-out',
        'voice-pulse': 'voice-pulse 1.5s ease-in-out infinite',
        'voice-bar-1': 'voice-bar-1 0.8s ease-in-out infinite',
        'voice-bar-2': 'voice-bar-2 0.6s ease-in-out infinite 0.2s',
        'voice-bar-3': 'voice-bar-3 0.7s ease-in-out infinite 0.1s',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(123, 179, 138, 0.3)' },
          '50%': { boxShadow: '0 0 24px rgba(123, 179, 138, 0.6)' },
        },
        'slide-in-right': {
          'from': { transform: 'translateX(100%)', opacity: '0' },
          'to': { transform: 'translateX(0)', opacity: '1' },
        },
        'fade-in': {
          'from': { opacity: '0', transform: 'translateY(10px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        'breathe': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' },
        },
        'scale-in': {
          'from': { transform: 'scale(0.8)', opacity: '0' },
          'to': { transform: 'scale(1)', opacity: '1' },
        },
        'voice-pulse': {
          '0%, 100%': { boxShadow: '0 0 4px rgba(239, 68, 68, 0.4)', transform: 'scale(1)' },
          '50%': { boxShadow: '0 0 16px rgba(239, 68, 68, 0.7)', transform: 'scale(1.05)' },
        },
        'voice-bar-1': {
          '0%, 100%': { height: '8px' },
          '50%': { height: '14px' },
        },
        'voice-bar-2': {
          '0%, 100%': { height: '12px' },
          '50%': { height: '6px' },
        },
        'voice-bar-3': {
          '0%, 100%': { height: '6px' },
          '50%': { height: '12px' },
        },
      },
    },
  },
  plugins: [],
}