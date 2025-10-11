import { EmailTemplateVariables } from "@/lib/types";
import { EMAIL_TEMPLATE_VARIABLES } from "@/lib/zod/schemas/campaigns";
import Image from "@tiptap/extension-image";
import Mention from "@tiptap/extension-mention";
import { generateHTML } from "@tiptap/html/server";
import StarterKit from "@tiptap/starter-kit";
import sanitizeHtml from "sanitize-html";
import { renderEmailTemplate } from "./render-email-template";

// This function configures the proper TipTap extensions (StarterKit, Image, Mention)
// and renders the campaign body with variable placeholders replaced.
export function generateCampaignEmailHTML({
  bodyJson,
  variables,
}: {
  bodyJson: any;
  variables: Partial<EmailTemplateVariables>;
}): string {
  const html = generateHTML(bodyJson, [
    StarterKit.configure({
      heading: {
        levels: [1, 2],
      },
    }),
    Image,
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

  return renderEmailTemplate({
    template: sanitizeHtmlBody(html),
    variables,
  });
}

const sanitizeHtmlBody = (body: string) => {
  return sanitizeHtml(body, {
    allowedTags: ["p", "strong", "em", "ul", "li", "a", "h1", "h2", "img"],
    allowedAttributes: {
      a: ["href", "name", "target", "rel"],
      img: ["src", "alt", "title"],
      "*": ["class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
  });
};
