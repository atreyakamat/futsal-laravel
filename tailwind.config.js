/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0df220",
          glow: "rgba(13, 242, 32, 0.4)",
        },
        dark: {
          DEFAULT: "#050505",
          soft: "#0a0a0a",
          surface: "#0f0f0f",
        },
        "primary-glow": "rgba(13, 242, 32, 0.4)",
        "dark-soft": "#0a0a0a",
        "dark-surface": "#0f0f0f",
        "text-muted": "#888888",
        "accent-cyan": "#00f2ff",
        "accent-purple": "#7000ff",
      },
      fontFamily: {
        sans: ["Space Grotesk", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      animation: {
        mesh: "mesh 10s ease infinite",
        float: "float 6s ease-in-out infinite",
        glow: "glow 2s ease-in-out infinite",
        fadeIn: "fadeIn 0.2s ease-out",
      },
      keyframes: {
        mesh: {
          "0%": { transform: "translate(0, 0)" },
          "50%": { transform: "translate(5%, 5%)" },
          "100%": { transform: "translate(0, 0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-20px)" },
        },
        glow: {
          "0%, 100%": { opacity: "0.8", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.05)" },
        },
        fadeIn: {
          from: { opacity: "0", transform: "translateY(-8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      backgroundImage: {
        "glass-gradient": "linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)",
        "primary-gradient": "linear-gradient(135deg, #0df220 0%, #00f2ff 100%)",
      },
    },
  },
  plugins: [],
};