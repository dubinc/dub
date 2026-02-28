import { vectorIndex } from "@/lib/upstash/vector";

const PAYOUT_COUNTRIES_URL = "https://app.dub.co/api/supported-countries";

let payoutCountriesCache: string | null = null;
async function getPayoutCountriesText(): Promise<string> {
  if (payoutCountriesCache) return payoutCountriesCache;
  try {
    const res = await fetch(PAYOUT_COUNTRIES_URL);
    const countries = (await res.json()) as { code: string; name: string }[];
    payoutCountriesCache = countries.map((c) => `- ${c.name}`).join("\n");
  } catch {
    payoutCountriesCache =
      "See https://dub.co/help/article/partner-payouts for the full list.";
  }
  return payoutCountriesCache;
}

/**
 * Clean raw MDX fetched from Mintlify's .md endpoint.
 * Strips frontmatter, imports, images, JSX components.
 * Replaces <PayoutSupportedCountries /> with the actual country list.
 */
export async function cleanMdx(raw: string): Promise<string> {
  let content = raw;

  content = content.replace(/^---[\s\S]*?---\s*/m, "");
  content = content.replace(
    /^import\s+.*from\s+['"][^'"]*['"]\s*;?\s*$/gm,
    "",
  );
  content = content.replace(/!\[.*?\]\(.*?\)/g, "");

  const countries = await getPayoutCountriesText();
  content = content.replace(/<PayoutSupportedCountries\s*\/>/g, countries);

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

  return content.trim();
}

type ArticleChunk = {
  id: string;
  content: string;
  url: string;
  heading: string;
  type: "docs" | "help";
};

/**
 * Split cleaned markdown into chunks at H2/H3 heading boundaries.
 * Each chunk carries the section URL + heading as metadata.
 */
export function chunkByHeadings(
  content: string,
  url: string,
): ArticleChunk[] {
  const lines = content.split("\n");
  const chunks: ArticleChunk[] = [];
  let currentHeading = "Introduction";
  let currentLines: string[] = [];

  const type: "docs" | "help" = url.includes("/help/") ? "help" : "docs";

  const flush = () => {
    const text = currentLines.join("\n").trim();
    if (text.length < 50) return;

    const slug = currentHeading
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const id = `${url}#${slug}`;
    chunks.push({
      id,
      content: `## ${currentHeading}\n\n${text}`,
      url: `${url}#${slug}`,
      heading: currentHeading,
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
    const slug = url.split("/").pop() || "article";
    chunks.push({
      id: `${url}#${slug}`,
      content,
      url,
      heading: "Overview",
      type,
    });
  }

  return chunks;
}

/**
 * Fetch, clean, chunk, and upsert a single article URL into Upstash Vector.
 * Uses heading-level chunks directly — no sentence-level fragmentation.
 */
export async function seedArticle(
  url: string,
): Promise<{ chunks: number; skipped?: boolean }> {
  const mdUrl = url.endsWith(".md") ? url : `${url}.md`;

  const res = await fetch(mdUrl);
  if (!res.ok) {
    console.warn(`Skipping (${res.status}): ${url}`);
    return { chunks: 0, skipped: true };
  }

  const raw = await res.text();
  const cleaned = await cleanMdx(raw);
  const chunks = chunkByHeadings(cleaned, url);

  for (const chunk of chunks) {
    await vectorIndex.upsert([
      {
        id: chunk.id,
        data: chunk.content,
        metadata: {
          url: chunk.url,
          heading: chunk.heading,
          type: chunk.type,
          content: chunk.content,
        },
      },
    ]);
  }

  return { chunks: chunks.length };
}

/**
 * Fetch all article URLs from dub.co/llms.txt.
 */
export async function fetchArticleUrls(): Promise<string[]> {
  const res = await fetch("https://dub.co/docs/llms.txt");
  if (!res.ok) throw new Error(`Failed to fetch llms.txt: ${res.status}`);

  const text = await res.text();
  const urls: string[] = [];

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    const linkMatch = trimmed.match(
      /\(?(https?:\/\/dub\.co\/(?:docs|help)[^\s)]*)\)?/,
    );
    if (linkMatch) {
      urls.push(linkMatch[1].replace(/\.md$/, ""));
    } else if (
      trimmed.startsWith("http") &&
      (trimmed.includes("/docs/") || trimmed.includes("/help/"))
    ) {
      urls.push(trimmed.replace(/\.md$/, ""));
    }
  }

  return [...new Set(urls)];
}
