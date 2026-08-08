import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#09070F",
        panel: "#120D1E",
        surface: "#171024",
        card: "#1C1330",
        brand: "#7C3AED",
        "brand-accent": "#8B5CF6",
        "brand-secondary": "#A78BFA",
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
