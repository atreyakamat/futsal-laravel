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
          DEFAULT: "#FF7A00", // Electric Orange (CTA)
          navy: "#0B1F5E",
          gold: "#F4B400",
          glow: "rgba(255, 122, 0, 0.4)",
        },
        dark: {
          DEFAULT: "#0F172A",
          soft: "#1E293B",
          surface: "#020617",
        },
        secondary: {
          blue: "#2563EB",
          cyan: "#06B6D4",
          red: "#DC2626",
          purple: "#4F46E5",
        },
        neutral: {
          bg: "#F8FAFC",
          surface: "#FFFFFF",
          light: "#E5E7EB",
          medium: "#6B7280",
          dark: "#374151",
          black: "#111827",
        },
        status: {
          success: "#22C55E",
          warning: "#F59E0B",
          error: "#EF4444",
          info: "#3B82F6",
        },
        // Kept for backward compatibility
        "primary-glow": "rgba(255, 122, 0, 0.4)",
        "dark-soft": "#1E293B",
        "dark-surface": "#020617",
        "text-muted": "#6B7280",
        "accent-cyan": "#06B6D4",
        "accent-purple": "#4F46E5",
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
        "primary-gradient": "linear-gradient(135deg, #0B1F5E 0%, #1E3A8A 100%)", // Navy Hero
        "cta-gradient": "linear-gradient(135deg, #FF7A00 0%, #F4B400 100%)", // Orange CTA
        "accent-gradient": "linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)", // Blue Accent
      },
    },
  },
  plugins: [],
};