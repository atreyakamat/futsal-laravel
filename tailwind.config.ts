import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0df220",
        dark: "#0a0a0a",
        surface: "#121212",
      },
    },
  },
  plugins: [],
};
export default config;
