import { DUB_WORDMARK } from "@dub/utils";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import { Footer } from "../components/footer";

export default function PartnerIdentityVerificationFailed({
  partner = {
    name: "John",
    email: "panic@thedis.co",
  },
  declineReason = "Document Obscured: ID document is partially obscured (e.g. by fingers)",
}: {
  partner: {
    name: string;
    email: string;
  };
  declineReason: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>Your identity verification failed</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mb-8 mt-6">
              <Img src={DUB_WORDMARK} width="61" height="32" alt="dub" />
            </Section>

            <Heading className="mx-0 p-0 text-lg font-semibold text-neutral-800">
              Identity verification failed
            </Heading>

            <Text className="text-sm leading-6 text-neutral-600">
              Hi {partner.name}, your identity verification couldn't be
              completed because {declineReason}.
            </Text>

            <Text className="text-sm leading-6 text-neutral-600">
              Please log back in to your dashboard and resubmit your details.
            </Text>

            <Section className="mb-10 mt-6">
              <Link
                className="rounded-lg bg-neutral-900 px-6 py-3 text-[13px] font-medium text-white no-underline"
                href="https://partners.dub.co/profile"
              >
                Go to your dashboard
              </Link>
            </Section>

            <Footer email={partner.email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
