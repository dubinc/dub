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
import { Footer } from "src/components/footer";

export default function IdentityVerificationAnnouncement({
  email = "panic@thedis.co",
  unsubscribeUrl = "https://partners.dub.co/account/settings",
}: {
  email: string;
  unsubscribeUrl: string;
}) {
  return (
    <Html>
      <Head>
        <style>{`
          @media only screen and (max-width: 600px) {
            .email-container {
              padding-left: 16px !important;
              padding-right: 16px !important;
            }
          }
        `}</style>
      </Head>
      <Preview>
        Build trust with programs and improve your approval chances
      </Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="email-container mx-auto my-10 max-w-[600px] px-10 py-5">
            <Section className="mt-2 text-center">
              <Img
                src={DUB_WORDMARK}
                width="77"
                height="40"
                alt="Dub"
                style={{
                  display: "block",
                  margin: "0 auto",
                }}
              />
            </Section>

            <Heading className="mx-auto mb-2 mt-10 max-w-[436px] text-center text-2xl font-semibold leading-8 tracking-tight text-neutral-800">
              Verify your identity on Dub
            </Heading>

            <Text className="mx-auto mb-10 mt-0 max-w-[436px] text-center text-base leading-6 tracking-tight text-neutral-600">
              We need you to verify your identity to keep your account secure
              and compliant.
            </Text>

            <Section className="mb-10 text-center">
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

            <Text className="text mx-auto mb-8 mt-0 max-w-[420px] text-center text-base text-neutral-600">
              Verified profiles also build trust with programs and can improve
              your approval chances.
            </Text>

            <Section className="mb-10 text-center">
              <Link
                className="rounded-lg bg-neutral-900 px-6 py-3 text-[13px] font-medium text-white no-underline"
                href="https://ship.dub.co/verify"
              >
                Start verification
              </Link>
            </Section>

            <Section className="mx-auto max-w-[400px] text-center">
              <Footer email={email} />
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
