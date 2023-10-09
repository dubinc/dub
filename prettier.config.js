// prettier.config.js
module.exports = {
  bracketSpacing: true,
  semi: true,
  trailingComma: "all",
  printWidth: 80,
  tabWidth: 2,
  plugins: [
    // comment for better diff
    "prettier-plugin-organize-imports",
    "prettier-plugin-tailwindcss",
  ],
};
