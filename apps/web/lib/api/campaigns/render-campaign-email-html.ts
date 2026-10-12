import { configureCampaignEmailImage } from "@/lib/tiptap/campaign-email-image";
import { EmailTemplateVariables, TiptapNode } from "@/lib/types";
import { EMAIL_TEMPLATE_VARIABLES } from "@/lib/zod/schemas/campaigns";
import { CAMPAIGN_EMAIL_TEXT_COLOR } from "@dub/email/templates/campaign-email";
import Mention from "@tiptap/extension-mention";
import { generateHTML } from "@tiptap/html/server";
import StarterKit from "@tiptap/starter-kit";
import sanitizeHtml from "sanitize-html";
import { interpolateEmailTemplate } from "./interpolate-email-template";

// neutral-500, matching the editor's list markers
const LIST_MARKER_COLOR = "#737373";

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
    configureCampaignEmailImage({
      HTMLAttributes: {
        style: "max-width: 100%; height: auto; margin: 12px auto;",
      },
    }),
    Mention.extend({
      addAttributes() {
        return {
          ...this.parent?.(),
          fallback: { default: null },
        };
      },
      renderHTML({ node }: { node: any }) {
        const label = node.attrs.fallback
          ? `{{${node.attrs.id} | ${node.attrs.fallback}}}`
          : `{{${node.attrs.id}}}`;
        return [
          "span",
          {
            class:
              "px-1 py-0.5 bg-blue-100 text-blue-700 rounded font-semibold",
            "data-type": "mention",
            "data-id": node.attrs.id,
          },
          label,
        ];
      },
      renderText({ node }: { node: any }) {
        return node.attrs.fallback
          ? `{{${node.attrs.id} | ${node.attrs.fallback}}}`
          : `{{${node.attrs.id}}}`;
      },
    }).configure({
      suggestion: {
        items: ({ query }: { query: string }) => {
          return EMAIL_TEMPLATE_VARIABLES.filter((item) =>
            item.toLowerCase().startsWith(query.toLowerCase()),
          ).slice(0, 10);
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
    // The bullet/number takes its color from the <li>, so color the <li> and
    // restore the body text color on the paragraph inside it (below).
    .replace(
      /<li([^>]*)>/g,
      `<li$1 style="margin-left: 0; padding-left: 4px; margin-top: 0px; margin-bottom: 4px; color: ${LIST_MARKER_COLOR};">`,
    )
    // Tiptap wraps each list item's content in a <p>, and email clients give it
    // a default 1em margin. Zero it so the 4px <li> margin is the only gap.
    .replace(
      /(<li[^>]*>)<p>/g,
      `$1<p style="margin: 0; color: ${CAMPAIGN_EMAIL_TEXT_COLOR};">`,
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
      "s",
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
      p: ["style"],
      "*": ["class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
  });
};
