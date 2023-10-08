// tailwind config is required for editor support
import sharedConfig from "tailwind-config/tailwind.config.ts";
import type { Config } from "tailwindcss";

const config: Pick<Config, "presets"> = {
  presets: [sharedConfig],
};

export default config;
