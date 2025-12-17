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

export default function DubPartnerRewind({
  email = "panic@thedis.co",
}: {
  email: string;
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
      <Preview>Your Dub Partner Rewind &rsquo;25 is ready</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="email-container mx-auto my-10 max-w-[600px] px-10 py-5">
            <Section className="mt-2 text-center">
              <Img
                src={DUB_WORDMARK}
                width="65"
                height="32"
                alt="Dub"
                style={{
                  display: "block",
                  margin: "0 auto",
                }}
              />
            </Section>

            <Heading className="mx-0 mb-2 mt-8 p-0 text-center text-2xl font-semibold text-black">
              Your Dub Partner Rewind &rsquo;25 is ready
            </Heading>

            <Text className="mb-8 mt-0 text-center text-base leading-6 text-neutral-600">
              2025 was a huge year for partners. Let&rsquo;s rewind to have a
              <br />
              look at your impact this year.
            </Text>

            <Section className="mb-8 text-center">
              <Link
                href="https://partners.dub.co/rewind/2025"
                style={{ textDecoration: "none" }}
              >
                <Img
                  src="https://assets.dub.co/misc/partner-rewind-2025/hero.jpg"
                  width="500"
                  height="292"
                  alt="Dub Program Marketplace"
                  className="mx-auto my-0 block h-auto max-w-full rounded-2xl border border-solid border-neutral-200"
                />
              </Link>
            </Section>

            <Heading className="mx-0 mb-3 mt-0 p-0 text-center text-lg font-semibold text-black">
              Just the beginning...
            </Heading>

            <Text className="mx-auto mb-8 mt-0 max-w-[400px] text-center text-sm leading-6 text-neutral-600">
              Thank you for all your hard work as a Dub partner. We can&rsquo;t
              wait to see what you&rsquo;ll do in 2026!
            </Text>

            <Section className="mb-8 text-center">
              <Link
                href="https://partners.dub.co/rewind/2025"
                className="box-border inline-block rounded-lg bg-neutral-900 px-6 py-3 text-center text-sm font-medium text-white no-underline"
                style={{
                  backgroundColor: "#171717",
                  color: "#ffffff",
                  borderRadius: "8px",
                  padding: "12px 24px",
                  textDecoration: "none",
                  display: "inline-block",
                  fontWeight: "500",
                  fontSize: "14px",
                }}
              >
                View your rewind
              </Link>
            </Section>

            <Section className="mx-auto max-w-[400px] text-center">
              <Footer email={email} marketing />
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
