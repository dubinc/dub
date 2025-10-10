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
  },
}: {
  campaign?: {
    subject: string;
    bodyJson: any;
  };
}) {
  const bodyHtml = generateHTML(campaign.bodyJson, [
    StarterKit.configure({
      heading: { levels: [1, 2] },
    }),
  ]);

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
