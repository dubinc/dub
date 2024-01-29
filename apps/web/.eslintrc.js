/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ["@dub/eslint-config/next.js"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: true,
  },
};
