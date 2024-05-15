const sharedConfig = require("@dub/tailwind-config/tailwind.config").default;

module.exports = {
  presets: [sharedConfig],
  content: [
    "./stories/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*{.js,.ts,.jsx,.tsx}",
  ],
};
