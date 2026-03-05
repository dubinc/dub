import { vectorIndex } from "../../lib/upstash/vector";
import { PAYOUT_SUPPORTED_COUNTRIES } from "../constants/payouts-supported-countries";
/**
 * Clean raw MDX fetched from Mintlify's .md endpoint.
 * Strips frontmatter, imports, images, JSX components.
 * Replaces <PayoutSupportedCountries /> with the actual country list.
 * Returns the cleaned content and the article title extracted from the H1 heading.
 */
async function cleanMdx(
  raw: string,
): Promise<{ content: string; title: string }> {
  let content = raw;

  content = content.replace(/^> ## Documentation Index\n(?:> [^\n]*\n)*/m, "");

  const h1Match = content.match(/^# (.+)$/m);
  const title = h1Match ? h1Match[1].trim() : "";

  content = content.replace(/^---[\s\S]*?---\s*/m, "");
  content = content.replace(/^import\s+.*from\s+['"][^'"]*['"]\s*;?\s*$/gm, "");
  content = content.replace(/!\[.*?\]\(.*?\)/g, "");

  content = content.replace(
    /<PayoutSupportedCountries\s*\/>/g,
    PAYOUT_SUPPORTED_COUNTRIES.map((c) => `- ${c.name} (${c.code})`).join("\n"),
  );

  content = content.replace(/<[A-Z][A-Za-z]*\s*\/>/g, "");

  const blockComponents = [
    "CardGroup",
    "Card",
    "Tabs",
    "Tab",
    "Note",
    "Tip",
    "Warning",
    "Info",
    "Check",
    "Steps",
    "Step",
    "Frame",
    "Accordion",
    "AccordionGroup",
    "ResponseField",
    "ParamField",
    "Expandable",
    "Update",
  ];
  for (const tag of blockComponents) {
    content = content.replace(new RegExp(`<${tag}(?:\\s[^>]*)?>`, "g"), "");
    content = content.replace(new RegExp(`</${tag}>`, "g"), "");
  }

  content = content.replace(/^\s*\w+=\{.*?\}\s*$/gm, "");
  content = content.replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
  content = content.replace(/\{`[^`]*`\}/g, "");
  content = content.replace(/<video[\s\S]*?<\/video>/g, "");
  content = content.replace(/<img[^>]*>/g, "");
  content = content.replace(/\n{3,}/g, "\n\n");

  return { content: content.trim(), title };
}

type ArticleChunk = {
  id: string;
  content: string;
  url: string;
  heading: string;
  title: string;
  type: "docs" | "help";
};

/**
 * Split cleaned markdown into chunks at H2/H3 heading boundaries.
 * Each chunk carries the section URL + heading as metadata.
 */
function chunkByHeadings(
  content: string,
  url: string,
  title: string,
): ArticleChunk[] {
  const lines = content.split("\n");
  const chunks: ArticleChunk[] = [];
  let currentHeading = "Introduction";
  let currentLines: string[] = [];
  const seenSlugs = new Map<string, number>();

  const type: "docs" | "help" = url.includes("/help/") ? "help" : "docs";

  const flush = () => {
    const text = currentLines.join("\n").trim();
    if (text.length < 50) {
      currentLines = [];
      return;
    }

    const baseSlug = currentHeading
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const count = (seenSlugs.get(baseSlug) ?? 0) + 1;
    seenSlugs.set(baseSlug, count);
    const slug = count === 1 ? baseSlug : `${baseSlug}-${count}`;

    const id = `${url}#${slug}`;
    chunks.push({
      id,
      content: `## ${currentHeading}\n\n${text}`,
      url: `${url}#${slug}`,
      heading: currentHeading,
      title,
      type,
    });
    currentLines = [];
  };

  for (const line of lines) {
    const h2Match = line.match(/^## (.+)$/);
    const h3Match = line.match(/^### (.+)$/);

    if (h2Match || h3Match) {
      flush();
      currentHeading = (h2Match || h3Match)![1].trim();
    } else {
      currentLines.push(line);
    }
  }

  flush();

  if (chunks.length === 0 && content.length > 50) {
    const baseSlug = url.split("/").pop() || "article";
    const count = (seenSlugs.get(baseSlug) ?? 0) + 1;
    seenSlugs.set(baseSlug, count);
    const slug = count === 1 ? baseSlug : `${baseSlug}-${count}`;
    chunks.push({
      id: `${url}#${slug}`,
      content,
      url: `${url}#${slug}`,
      heading: "Overview",
      title,
      type,
    });
  }

  return chunks;
}

/**
 * Maps every allowed hostname to its canonical HTTPS origin.
 * The outgoing request origin is always picked from this map — never
 * constructed directly from user-supplied input — to prevent SSRF.
 * This is also the source of truth for the hostname allowlist.
 */
const HOSTNAME_TO_ORIGIN: Record<string, string> = {
  "dub.co": "https://dub.co",
  "www.dub.co": "https://www.dub.co",
};
const ALLOWED_HOSTNAMES = Object.keys(HOSTNAME_TO_ORIGIN);
const ALLOWED_PATH_PREFIXES = ["/docs", "/help"];

/**
 * Sanitize pathname: keep only alphanumeric, hyphens, underscores, slashes,
 * and dots, then collapse any remaining ".." sequences to prevent path
 * traversal even if the caller skips the pre-validation step.
 */
function sanitizePathname(pathname: string): string {
  return pathname.replace(/[^a-zA-Z0-9\-_/.]/g, "").replace(/\.\.+/g, "");
}

/**
 * Fetch, clean, chunk, and upsert a single article URL into Upstash Vector.
 * Uses heading-level chunks directly — no sentence-level fragmentation.
 * Validates URL to restrict fetches to dub.co docs/help (SSRF guard).
 *
 * @param pageviewsMap
 *
 *
 */
export async function upsertDocsEmbeddings(
  url: string,
  pageviewsMap?: Map<string, number>,
): Promise<{ chunks: number; skipped?: boolean }> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    console.warn(`Skipping (invalid URL): ${url}`);
    return { chunks: 0, skipped: true };
  }

  if (
    parsedUrl.protocol !== "https:" ||
    !ALLOWED_HOSTNAMES.includes(parsedUrl.hostname) ||
    parsedUrl.pathname.includes("..") ||
    !ALLOWED_PATH_PREFIXES.some((p) => parsedUrl.pathname.startsWith(p))
  ) {
    console.warn(`Skipping (disallowed URL): ${url}`);
    return { chunks: 0, skipped: true };
  }

  const origin = HOSTNAME_TO_ORIGIN[parsedUrl.hostname] ?? "https://dub.co";
  const sanitizedPath = sanitizePathname(parsedUrl.pathname);
  const pathnameWithMd = sanitizedPath.endsWith(".md")
    ? sanitizedPath
    : `${sanitizedPath}.md`;
  const normalizedUrl = `${origin}${sanitizedPath}`;
  const mdUrl = `${origin}${pathnameWithMd}`;

  const res = await fetch(mdUrl);
  if (!res.ok) {
    console.warn(`Skipping (${res.status}): ${normalizedUrl}`);
    return { chunks: 0, skipped: true };
  }

  const raw = await res.text();
  const { content: cleaned, title } = await cleanMdx(raw);
  const chunks = chunkByHeadings(cleaned, normalizedUrl, title);

  // Look up pageviews for this article (keyed by pathname, not full URL)
  const pathname = new URL(normalizedUrl).pathname;
  const pageviews = pageviewsMap?.get(pathname) ?? 0;

  // Upstash Vector has a 48KB metadata size limit per vector.
  const MAX_METADATA_CONTENT = 4000;

  await Promise.all(
    chunks.map(async (chunk) => {
      await vectorIndex.upsert([
        {
          id: chunk.id,
          data: chunk.content,
          metadata: {
            url: chunk.url,
            heading: chunk.heading,
            title: chunk.title || chunk.heading,
            type: chunk.type,
            pageviews,
            content: chunk.content.slice(0, MAX_METADATA_CONTENT),
          },
        },
      ]);
    }),
  );

  return { chunks: chunks.length };
}
