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
    body: "",
  },
}: {
  campaign?: {
    subject: string;
    body: string;
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
              <div dangerouslySetInnerHTML={{ __html: campaign.body }} />
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
