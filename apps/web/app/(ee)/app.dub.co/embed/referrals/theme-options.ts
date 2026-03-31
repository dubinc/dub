import * as z from "zod/v4";

export type ThemeOptions = {
  backgroundColor?: string;
};

export function parseThemeOptions(themeOptions?: string): ThemeOptions {
  if (!themeOptions) return {};

  try {
    const parsed = JSON.parse(themeOptions);
    return z
      .object({
        backgroundColor: z.string().optional(),
      })
      .parse(parsed);
  } catch (error) {
    console.warn("Error parsing themeOptions", error);
  }

  return {};
}
