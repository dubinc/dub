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

export default function CampaignEmail({
  campaign = {
    subject: "Test Subject",
    body: {
      type: "doc",
      content: [],
    },
  },
}: {
  campaign?: {
    subject: string;
    body: Record<string, any>;
  };
}) {
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
              {/* TODO: Render email body */}
              <div dangerouslySetInnerHTML={{ __html: "WIP" }} />
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
