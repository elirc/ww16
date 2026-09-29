import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#132238",
        mist: "#eef4f1",
        signal: "#ea580c",
        pine: "#1d4d4f",
        gold: "#c2922b",
      },
      boxShadow: {
        card: "0 18px 48px rgba(19, 34, 56, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
