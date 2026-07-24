import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0B0B0F",
        panel: "#101116",
        brand: "#3B82F6",
      },
      boxShadow: {
        glow: "0 0 50px rgba(59,130,246,.15)",
      },
      backgroundImage: {
        grid: "linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px)"
      }
    },
  },
  plugins: [],
} satisfies Config;
