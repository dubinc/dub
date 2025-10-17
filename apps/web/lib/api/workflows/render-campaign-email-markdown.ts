import { EmailTemplateVariables, TiptapNode } from "@/lib/types";
import { EMAIL_TEMPLATE_VARIABLES } from "@/lib/zod/schemas/campaigns";
import Image from "@tiptap/extension-image";
import Mention from "@tiptap/extension-mention";
import StarterKit from "@tiptap/starter-kit";
import { renderToMarkdown } from "@tiptap/static-renderer/pm/markdown";
import { interpolateEmailTemplate } from "./interpolate-email-template";

export function renderCampaignEmailMarkdown({
  content,
  variables,
}: {
  content: TiptapNode | TiptapNode[];
  variables: Partial<EmailTemplateVariables>;
}): string {
  if (!content) {
    throw new Error("Document cannot be null or undefined");
  }

  let markdown = renderToMarkdown({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2],
        },
      }),
      Image,
      Mention.configure({
        suggestion: {
          items: ({ query }: { query: string }) => {
            return EMAIL_TEMPLATE_VARIABLES.filter((item) =>
              item.toLowerCase().startsWith(query.toLowerCase()),
            ).slice(0, 5);
          },
        },
      }),
    ],
    content,
    options: {
      nodeMapping: {
        mention: (props: any) => {
          return `{{${props.node.attrs.id}}}`;
        },
      },
    },
  });


  markdown = markdown.replace(/^[\s\n]+|[\s\n]+$/g, "");

  return interpolateEmailTemplate({ 
    text: markdown, 
    variables 
  });
}
