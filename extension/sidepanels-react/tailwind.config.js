module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./src/index.html",
  ],
  theme: {
    extend: {
      colors: {
        background: '#121212',
        card: '#1e1e1e',
        accent: '#8c52ff',
        error: '#ff5252',
        'text-primary': '#ffffff',
        'text-secondary': 'rgba(255, 255, 255, 0.6)',
        border: '#333333',
      },
    },
  },
  plugins: [],
} 