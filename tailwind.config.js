/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-nunito)", "Nunito", "system-ui", "sans-serif"],
        heading: ["var(--font-merriweather)", "Merriweather", "serif"],
        serif: ["var(--font-merriweather)", "Merriweather", "serif"],
      },
      colors: {
        brand: {
          navy: "#243E76",
          teal: "#0481A2",
          accent: "#0481A2",
          cyan: "#0481A2",
          blue: "#243E76",
        },
        primary: {
          DEFAULT: "#243E76",
          hover: "#1b305e",
          light: "#EBF1FA",
        },
        accent: {
          DEFAULT: "#0481A2",
          hover: "#036a85",
          light: "#E6F5F8",
        },
      },
    },
  },
  plugins: [],
};


