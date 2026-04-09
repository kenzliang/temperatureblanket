import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // 'class' mode + inline script in layout.tsx prevents the flash of wrong theme
  // that occurs with 'media' mode in Next.js SSR.
  darkMode: 'class',
  theme: { extend: {} },
  plugins: [],
};

export default config;
