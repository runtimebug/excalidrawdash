import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Excalidraw-ish brand palette
        brand: {
          DEFAULT: "#6965db",
          fg: "#5b57d1",
          subtle: "#e3e2fe",
        },
        ink: {
          DEFAULT: "#1b1b1f",
          soft: "#3d3d43",
          faint: "#6c6c75",
        },
        surface: {
          DEFAULT: "#ffffff",
          muted: "#f6f6fb",
          sunken: "#ececf5",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-assistant)",
          "Assistant",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(27,27,31,0.04), 0 4px 16px rgba(27,27,31,0.06)",
        "card-hover":
          "0 2px 4px rgba(27,27,31,0.06), 0 12px 28px rgba(27,27,31,0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
