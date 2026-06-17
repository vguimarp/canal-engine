/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)", "paper-2": "var(--paper-2)",
        ink: "var(--ink)", "ink-dim": "var(--ink-dim)",
        amber: "var(--amber)", "amber-dim": "var(--amber-dim)",
        line: "var(--line)", alert: "var(--alert)", ok: "var(--ok)",
      },
    },
  },
  plugins: [],
};
