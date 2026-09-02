import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#070511",
        panel: "#0D0820",
        surface: "#140B2A",
        card: "#211044",
        brand: "#7C3AED",
        "brand-accent": "#9333EA",
        "brand-secondary": "#C084FC",
      },
      boxShadow: {
        glow: "0 0 50px rgba(124,58,237,.15)",
      },
      backgroundImage: {
        grid: "linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px)"
      }
    },
  },
  plugins: [],
} satisfies Config;
