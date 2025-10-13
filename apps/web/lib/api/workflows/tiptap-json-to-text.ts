import { EmailTemplateVariables } from "@/lib/types";

const DEFAULTS: Required<Options> = {
  preserveNewlines: true,
  wordwrap: 0,
  preserveLinks: true,
  preserveImages: true,
  listIndent: "  ",
  variables: {},
};

export interface TiptapNode {
  type: string;
  text?: string;
  attrs?: Record<string, any>;
  content?: TiptapNode[];
  marks?: Array<{ type: string; attrs?: Record<string, any> }>;
}

export interface Options {
  // Keep paragraph/heading line breaks as \n\n (default: true)
  preserveNewlines?: boolean;

  // Number of columns to wrap lines at (0 = disabled, default: 0)
  wordwrap?: number;

  // Include URLs after link text like "text (https://...)" (default: true)
  preserveLinks?: boolean;

  // Include image alt text or placeholder (default: false)
  preserveImages?: boolean;

  // Indentation string per list level (default: "  ")
  listIndent?: string;

  // Template variables for replacement (default: {})
  variables?: Partial<EmailTemplateVariables>;
}

// Simple wordwrap implementation (does not break words if a single token > width)
function wrapLine(line: string, width: number): string[] {
  if (!width || width <= 0) {
    return [line];
  }

  const words = line.split(/(\s+)/); // keep spaces as tokens
  const lines: string[] = [];
  let cur = "";

  for (const token of words) {
    if ((cur + token).length > width && cur.length > 0) {
      lines.push(cur.trimRight());
      cur = token;
    } else {
      cur += token;
    }
  }

  if (cur.length) {
    lines.push(cur.trimRight());
  }

  return lines;
}

function applyWrap(text: string, width: number): string {
  if (!width || width <= 0) {
    return text;
  }

  const paragraphs = text.split(/\n\n/);
  return paragraphs
    .map((p) => wrapLine(p.replace(/[\n\s]+/g, " "), width).join("\n"))
    .join("\n\n");
}

function escapeText(t: string): string {
  // This is plain-text -> no HTML; just normalize control chars
  return t.replace(/\u0000/g, "");
}

// Replace template variables
function replaceVariables(
  text: string,
  variables: Partial<EmailTemplateVariables>,
): string {
  if (!variables || Object.keys(variables).length === 0) {
    return text;
  }

  return text.replace(/{{\s*([\w\d_]+)\s*}}/g, (_, key) => {
    return variables[key] ?? `{{${key}}}`;
  });
}

// Process link href, stripping mailto: prefix and checking if it differs from text
function processLinkHref(href: string, text: string): string | null {
  let cleanHref = href;
  // Strip mailto: prefix for email links
  if (cleanHref.startsWith("mailto:")) {
    cleanHref = cleanHref.substring(7);
  }

  // Only return href if it's different from the text content
  return cleanHref !== text.trim() ? cleanHref : null;
}

// Render marks like bold/italic — we do not preserve formatting as markup, but may preserve as-is
function renderMarks(text: string, marks?: TiptapNode["marks"]): string {
  // For plain text messages we typically keep the raw text. Optionally we could add * or _ markers.
  return text;
}

// Small, secure converter from Tiptap JSON -> plain text.
export function tiptapToPlainText(
  doc: TiptapNode | TiptapNode[],
  opts?: Options,
): string {
  if (!doc) {
    throw new Error("Document cannot be null or undefined");
  }

  const conf = { ...DEFAULTS, ...(opts || {}) };

  const roots: TiptapNode[] = Array.isArray(doc) ? doc : [doc];

  function walk(
    node: TiptapNode,
    listState: { type?: string; index?: number; level?: number }[] = [],
  ): string {
    if (!node) {
      return "";
    }

    // Handle malformed nodes gracefully
    if (typeof node !== "object" || !node.type) {
      console.warn("Encountered malformed node:", node);
      return "";
    }

    switch (node.type) {
      case "doc":
        return (node.content || [])
          .map((n) => walk(n, listState))
          .join(conf.preserveNewlines ? "\n\n" : "\n");

      case "paragraph":
        return (node.content || []).map((n) => walk(n, listState)).join("");

      case "text": {
        let text = renderMarks(escapeText(node.text || ""), node.marks);

        // Replace template variables if any
        text = replaceVariables(text, conf.variables || {});

        // Process link marks
        if (conf.preserveLinks && node.marks) {
          node.marks.forEach((mark) => {
            if (mark.type === "link" && mark.attrs?.href) {
              const href = processLinkHref(mark.attrs.href, text);
              if (href) {
                text += ` ${href}`;
              }
            }
          });
        }

        return text;
      }

      case "heading": {
        const text = (node.content || [])
          .map((n) => walk(n, listState))
          .join("");
        // For headings, keep as a paragraph with an underline (optional). We'll keep simple: text + newline
        return text;
      }

      case "bulletList": {
        // Render each listItem with bullets; increment level
        const items = (node.content || [])
          .map((n) =>
            walk(n, [
              ...listState,
              { type: "bullet", level: listState.length + 1 },
            ]),
          )
          .join("\n");
        return items;
      }

      case "orderedList": {
        const start =
          node.attrs && node.attrs.start ? Number(node.attrs.start) : 1;
        const items = (node.content || [])
          .map((n, i) =>
            walk(n, [
              ...listState,
              {
                type: "ordered",
                index: start + i,
                level: listState.length + 1,
              },
            ]),
          )
          .join("\n");
        return items;
      }

      case "listItem": {
        // listItem typically contains a paragraph (and maybe nested lists)
        // Find first paragraph/text content
        const prefixParts: string[] = [];
        if (listState.length > 0) {
          const cur = listState[listState.length - 1];
          const indent = conf.listIndent.repeat((cur.level || 1) - 1);

          if (cur.type === "bullet") {
            prefixParts.push(indent + "• ");
          } else if (cur.type === "ordered") {
            prefixParts.push(indent + `${cur.index}. `);
          }
        }

        const inner = (node.content || [])
          .map((n) => walk(n, listState))
          .join("");

        // ensure lines within item are indented properly
        const innerLines = inner
          .split(/\n/)
          .map((l, idx) =>
            idx === 0
              ? l
              : conf.listIndent.repeat(
                  listState[listState.length - 1]?.level || 1,
                ) + l,
          )
          .join("\n");

        return prefixParts.join("") + innerLines;
      }

      case "image": {
        if (!conf.preserveImages) {
          return "";
        }

        const alt =
          node.attrs && (node.attrs.alt || node.attrs.title || "image");
        const src = node.attrs && node.attrs.src;

        return alt
          ? `[image: ${alt}]${conf.preserveLinks && src ? ` (${src})` : ""}`
          : conf.preserveLinks && src
            ? src
            : "[image]";
      }

      case "hardBreak":
      case "br":
        return "\n";

      case "blockquote": {
        const inner = (node.content || [])
          .map((n) => walk(n, listState))
          .join("\n");
        return inner
          .split(/\n/)
          .map((l) => `> ${l}`)
          .join("\n");
      }

      case "codeBlock":
      case "code": {
        const text = (node.content || [])
          .map((n) => walk(n, listState))
          .join("");

        // Preserve as-is but mark with backticks for inline, fenced for block
        if (node.type === "codeBlock") {
          return `\n\n\u0060\u0060\u0060\n${text}\n\u0060\u0060\u0060\n\n`;
        }

        return `\`${text}\``;
      }

      case "hard_break":
        return "\n";

      case "mention": {
        // Mention node: show label if present, else @id
        const id = node.attrs?.id;
        const label = node.attrs?.label;

        if (conf.variables && id && conf.variables[id] !== undefined) {
          return conf.variables[id] ?? "";
        }

        return label || (id ? `@${id}` : "@mention");
      }

      case "link":
      case "a": {
        // In Tiptap, link is usually a mark not a node; but handle here defensively
        const text = (node.content || [])
          .map((n) => walk(n, listState))
          .join("");
        const href = node.attrs?.href;

        if (conf.preserveLinks && href) {
          const processedHref = processLinkHref(href, text);

          if (processedHref) {
            return `${text} ${processedHref}`;
          }
        }

        return text;
      }

      default: {
        // Fallback: walk children
        return (node.content || []).map((n) => walk(n, listState)).join("");
      }
    }
  }

  const raw = roots
    .map((r) => walk(r, []))
    .join(conf.preserveNewlines ? "\n\n" : "\n");

  // Normalize repeated blank lines to max two
  let normalized = raw.replace(/\n{3,}/g, "\n\n");

  // Trim each line but preserve intentional spaces
  normalized = normalized
    .split(/\n/)
    .map((l) => l.replace(/[\t\r]+/g, ""))
    .join("\n")
    .trim();

  // Apply wordwrap if requested
  return applyWrap(normalized, conf.wordwrap);
}
