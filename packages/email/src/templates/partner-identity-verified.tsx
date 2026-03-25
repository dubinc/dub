import { DUB_WORDMARK } from "@dub/utils";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import { Footer } from "../components/footer";

export default function PartnerIdentityVerified({
  partner = {
    name: "John",
    email: "panic@thedis.co",
  },
}: {
  partner: {
    name: string;
    email: string;
  };
}) {
  return (
    <Html>
      <Head />
      <Preview>Your identity has been verified</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mb-8 mt-6">
              <Img src={DUB_WORDMARK} width="61" height="32" alt="dub" />
            </Section>

            <Heading className="mx-0 p-0 text-lg font-medium text-neutral-600">
              Hello {partner.name},
            </Heading>

            <Text className="text-sm leading-6 text-neutral-600">
              Your identity has been successfully verified. No further action is
              required.
            </Text>

            <Text className="text-sm leading-6 text-neutral-600">
              This helps build trust with programs and enables faster payout
              approvals.
            </Text>

            <Footer email={partner.email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
