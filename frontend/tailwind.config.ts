import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        accent: {
          DEFAULT: "var(--accent)",
          light: "var(--accent-light)",
          dark: "var(--accent-dark)",
        },
        surface: {
          DEFAULT: "var(--surface)",
          hover: "var(--surface-hover)",
        },
        muted: "var(--muted)",
      },
      borderColor: {
        DEFAULT: "var(--border)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        soft: "0 2px 8px -2px rgba(0,0,0,0.08)",
        medium: "0 8px 24px -4px rgba(0,0,0,0.08)",
        large: "0 20px 40px -12px rgba(0,0,0,0.12)",
        glow: "0 0 40px -8px rgba(99, 102, 241, 0.3)",
      },
    },
  },
  plugins: [],
};
export default config;
