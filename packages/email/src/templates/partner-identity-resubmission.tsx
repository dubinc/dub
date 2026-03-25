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

export default function PartnerIdentityResubmission({
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
      <Preview>Additional documents needed for identity verification</Preview>
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
              We need additional information to verify your identity. Please
              resubmit your documents.
            </Text>

            <Text className="text-sm leading-6 text-neutral-600">
              You can resume verification from your{" "}
              <Link
                href="https://partners.dub.co/profile"
                className="font-semibold text-neutral-700 underline underline-offset-2"
              >
                profile page ↗
              </Link>
              .
            </Text>

            <Footer email={partner.email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
