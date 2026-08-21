import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0C2A22",
        grass: { DEFAULT: "#17864B", dark: "#0F6A3A" },
        chalk: "#F4F6F3",
        tape: "#E8B93B",
        rpe: {
          low: "#17864B",
          mid: "#D9A514",
          high: "#D97614",
          max: "#C2402A",
        },
      },
      fontFamily: {
        display: ["Archivo", "system-ui", "sans-serif"],
        sans: ["'Instrument Sans'", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
