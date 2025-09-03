"server-only";

import { readFile } from "fs/promises";
import { join } from "path";

export async function getIntegrationGuideMarkdown(
  guideKey: string,
): Promise<string | null> {
  const sanitizedKey = guideKey.replace(/[^a-zA-Z0-9-_]/g, "");

  if (sanitizedKey !== guideKey) {
    return null;
  }

  // Use a more explicit path construction to satisfy the linter
  const guidesDirectory = join(process.cwd(), "guides");
  const markdownPath = join(guidesDirectory, `${sanitizedKey}.md`);

  // Additional security check: ensure the path is within the expected directory
  if (!markdownPath.startsWith(guidesDirectory)) {
    return null;
  }

  try {
    return await readFile(markdownPath, "utf-8");
  } catch (error) {
    return null;
  }
}
