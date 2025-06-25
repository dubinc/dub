import { readFile } from "fs/promises";
import { join, normalize } from "path";

export async function getIntegrationGuideMarkdown(
  guideKey: string,
): Promise<string | null> {
  const sanitizedKey = guideKey.replace(/[^a-zA-Z0-9-_]/g, "");

  if (sanitizedKey !== guideKey) {
    return null;
  }

  const markdownPath = join(
    process.cwd(),
    "integration-guides",
    `${sanitizedKey}.md`,
  );

  // Additional security check: ensure the path is within the expected directory
  const normalizedPath = normalize(markdownPath);
  const expectedBase = normalize(join(process.cwd(), "integration-guides"));

  if (!normalizedPath.startsWith(expectedBase)) {
    return null;
  }

  try {
    return await readFile(normalizedPath, "utf-8");
  } catch (error) {
    return null;
  }
}
