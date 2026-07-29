import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#041f1f',
        surface: '#0d3b5f',
        panel: '#093544',
        accent: '#10b981',
        text: '#f8fafc',
      },
    },
  },
  plugins: [],
};

export default config;
