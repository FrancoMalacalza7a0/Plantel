import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Tema oscuro: chalk es ahora el fondo (el verde tinta de siempre),
        // ink es ahora el texto/borde claro. Swap deliberado para invertir
        // el contraste de toda la app sin tocar cada className.
        chalk: "#0C2A22",
        ink: "#F4F6F3",
        grass: { DEFAULT: "#17864B", dark: "#0F6A3A" },
        mint: "#4ED18A",
        tape: "#E8B93B",
        rpe: {
          low: "#4ED18A",
          mid: "#E8B93B",
          high: "#E8933B",
          max: "#E85D4A",
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
