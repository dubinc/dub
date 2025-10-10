import { DUB_WORDMARK } from "@dub/utils";
import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
} from "@react-email/components";
import Mention from "@tiptap/extension-mention";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";

const bodyJson = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Hello, world!",
        },
      ],
    },
  ],
};

export default function CampaignEmail({
  campaign = {
    subject: "Test Subject",
    bodyJson,
    variables: {},
  },
}: {
  campaign?: {
    subject: string;
    bodyJson: any;
    variables: Record<string, string>;
  };
}) {
  let bodyHtml = generateHTML(campaign.bodyJson, [
    StarterKit.configure({
      heading: {
        levels: [1, 2],
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
    }),
  ]);

  bodyHtml = bodyHtml.replace(
    /{{\s*([\w.]+)(?:\|([^}]+))?\s*}}/g,
    (_, key, fallback) => {
      const value = campaign.variables[key];
      return value != null ? String(value) : fallback ?? "";
    },
  );

  return (
    <Html>
      <Head />
      <Preview>{campaign.subject}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] px-10 py-5">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>

            <Section className="my-6">
              <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
