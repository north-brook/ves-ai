import type { Config } from "tailwindcss";

const config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#f3efe7",
        ink: "#181a19",
        card: "#fffdf8",
        sea: {
          300: "#5ad6ca",
          500: "#0f766e",
          700: "#0b4f4a",
        },
      },
      boxShadow: {
        block: "8px 8px 0 0 #181a19",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
      },
    },
  },
} satisfies Config;

export default config;
