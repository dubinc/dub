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

            <Heading className="mx-0 p-0 text-lg font-semibold text-neutral-800">
              You're verified!
            </Heading>

            <Text className="text-sm leading-6 text-neutral-600">
              Hi {partner.name}, your identity has been verified for your
              partner profile on Dub!
            </Text>

            <Section className="mb-8 text-center">
              <Img
                src="https://assets.dub.co/email-assets/partner-verify-identity-hero.jpg"
                width="196"
                height="153"
                alt="Identity verification"
                style={{
                  display: "block",
                  margin: "0 auto",
                }}
              />
            </Section>

            <Text className="text-sm leading-6 text-neutral-600">
              Thank you for helping create a more trustworthy partner network.
              You can now get approved for programs faster.
            </Text>

            <Footer email={partner.email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
