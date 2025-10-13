import { EmailTemplateVariables } from "@/lib/types";

export interface TiptapNode {
  type: string;
  text?: string;
  attrs?: Record<string, any>;
  content?: TiptapNode[];
  marks?: Array<{ type: string; attrs?: Record<string, any> }>;
}

interface Options {
  variables?: Partial<EmailTemplateVariables>;
}

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

// Convert TipTap JSON to Markdown (for in-app Messages)
export function tiptapToMarkdown(
  doc: TiptapNode | TiptapNode[],
  opts?: Options,
): string {
  if (!doc) {
    throw new Error("Document cannot be null or undefined");
  }

  const variables = opts?.variables || {};
  const roots: TiptapNode[] = Array.isArray(doc) ? doc : [doc];

  function walk(node: TiptapNode): string {
    if (!node || typeof node !== "object" || !node.type) {
      return "";
    }

    switch (node.type) {
      case "doc": {
        return (node.content || []).map((n) => walk(n)).join("\n\n");
      }

      // Paragraphs
      case "paragraph": {
        return (node.content || []).map((n) => walk(n)).join("");
      }

      // Text
      case "text": {
        let text = node.text || "";

        text = replaceVariables(text, variables);

        if (node.marks) {
          node.marks.forEach((mark) => {
            if (mark.type === "bold" || mark.type === "strong") {
              text = `**${text}**`;
            } else if (mark.type === "italic" || mark.type === "em") {
              text = `*${text}*`;
            } else if (mark.type === "link") {
              const href = mark.attrs?.href || "";
              text = `[${text}](${href})`;
            }
          });
        }

        return text;
      }

      // Headings (1-6)
      case "heading": {
        const level = node.attrs?.level || 1;
        const text = (node.content || []).map((n) => walk(n)).join("");
        const prefix = "#".repeat(level);

        return `${prefix} ${text}`;
      }

      // Unordered lists
      case "bulletList": {
        return (node.content || [])
          .map((item) => {
            const content = walk(item);
            return `- ${content}`;
          })
          .join("\n");
      }

      // Ordered lists
      case "orderedList": {
        const start = node.attrs?.start || 1;
        return (node.content || [])
          .map((item, index) => {
            const content = walk(item);
            return `${start + index}. ${content}`;
          })
          .join("\n");
      }

      // List items
      case "listItem": {
        return (node.content || []).map((n) => walk(n)).join("\n");
      }

      // Images
      case "image": {
        const src = node.attrs?.src || "";
        const alt = node.attrs?.alt || "";

        return `![${alt}](${src})`;
      }

      // Mentions
      case "mention": {
        const id = node.attrs?.id;

        if (variables && id && variables[id] !== undefined) {
          return variables[id] ?? "";
        }

        return `{{${id}}}`;
      }

      // Horizontal rule
      case "horizontalRule": {
        return "---";
      }

      // Blockquote
      case "blockquote": {
        const content = (node.content || [])
          .map((n) => walk(n))
          .join("\n")
          .split("\n")
          .map((line) => `> ${line}`)
          .join("\n");
        return content;
      }

      // Hard breaks
      case "hardBreak":
      case "hard_break": {
        return "  \n";
      }

      // Fallback: walk children
      default: {
        return (node.content || []).map((n) => walk(n)).join("");
      }
    }
  }

  return roots.map((r) => walk(r)).join("\n");
}
