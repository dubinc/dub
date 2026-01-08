import { EmailTemplateVariables, TiptapNode } from "@/lib/types";
import { EMAIL_TEMPLATE_VARIABLES } from "@/lib/zod/schemas/campaigns";
import Image from "@tiptap/extension-image";
import Mention from "@tiptap/extension-mention";
import { generateHTML } from "@tiptap/html/server";
import StarterKit from "@tiptap/starter-kit";
import sanitizeHtml from "sanitize-html";
import { interpolateEmailTemplate } from "./interpolate-email-template";

export function renderCampaignEmailHTML({
  content,
  variables,
}: {
  content: TiptapNode | TiptapNode[];
  variables: Partial<EmailTemplateVariables>;
}): string {
  const html = generateHTML(content, [
    StarterKit.configure({
      heading: {
        levels: [1, 2],
      },
    }),
    Image.configure({
      HTMLAttributes: {
        style: "max-width: 100%; height: auto; margin: 12px auto;",
      },
    }),
    Mention.extend({
      renderHTML({ node }: { node: any }) {
        return [
          "span",
          {
            class:
              "px-1 py-0.5 bg-blue-100 text-blue-700 rounded font-semibold",
            "data-type": "mention",
            "data-id": node.attrs.id,
          },
          `{{${node.attrs.id}}}`,
        ];
      },
      renderText({ node }: { node: any }) {
        return `{{${node.attrs.id}}}`;
      },
    }).configure({
      suggestion: {
        items: ({ query }: { query: string }) => {
          return EMAIL_TEMPLATE_VARIABLES.filter((item) =>
            item.toLowerCase().startsWith(query.toLowerCase()),
          ).slice(0, 5);
        },
      },
    }),
  ]);

  const htmlWithListStyles = html
    .replace(
      /<ul([^>]*)>/g,
      '<ul$1 style="padding-left: 30px; margin-left: 0;">',
    )
    .replace(
      /<ol([^>]*)>/g,
      '<ol$1 style="padding-left: 30px; margin-left: 0;">',
    )
    .replace(
      /<li([^>]*)>/g,
      '<li$1 style="margin-left: 0; padding-left: 4px; margin-top: 0px; margin-bottom: 0px;">',
    );

  return interpolateEmailTemplate({
    text: sanitizeHtmlBody(htmlWithListStyles),
    variables,
  });
}

const sanitizeHtmlBody = (body: string) => {
  return sanitizeHtml(body, {
    allowedTags: [
      "p",
      "strong",
      "em",
      "ul",
      "ol",
      "li",
      "a",
      "h1",
      "h2",
      "img",
      "br",
    ],
    allowedAttributes: {
      a: ["href", "name", "target", "rel"],
      img: ["src", "alt", "title", "style"],
      ul: ["style"],
      ol: ["style"],
      li: ["style"],
      "*": ["class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
  });
};
