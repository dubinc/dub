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

export default function ProgramMarketplaceAnnouncement({
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
      <Preview>Discover and apply to more programs on Dub.</Preview>
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
              Dub Program Marketplace is here
            </Heading>

            <Text className="mb-8 mt-0 text-center text-base leading-6 text-neutral-600">
              A new way to discover, join, and partner with
              <br />
              more programs on Dub.
            </Text>

            <Section className="mb-8 text-center">
              <Link
                href="https://partners.dub.co/programs/marketplace"
                style={{ textDecoration: "none" }}
              >
                <Img
                  src="https://assets.dub.co/cms/marketplace-announcement-logo-full-optimize.gif"
                  width="500"
                  height="292"
                  alt="Dub Program Marketplace"
                  style={{
                    display: "block",
                    maxWidth: "100%",
                    height: "auto",
                    margin: "0 auto",
                  }}
                />
              </Link>
            </Section>

            <Heading className="mx-0 mb-3 mt-0 p-0 text-center text-lg font-semibold text-black">
              Over 40+ programs to join
            </Heading>

            <Text className="mx-auto mb-8 mt-0 max-w-[420px] text-center text-sm leading-6 text-neutral-600">
              Find programs that fit your audience, compare rewards, and submit
              your application. It is the easiest way to expand your reach and
              unlock new earning possibilities.
            </Text>

            <Section className="mb-8 text-center">
              <Link
                href="https://partners.dub.co/programs"
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
                Explore the program marketplace
              </Link>
            </Section>

            {/* Footer */}
            <Section className="mx-auto max-w-[400px] text-center">
              <Footer
                email={email}
                notificationSettingsUrl="https://partners.dub.co/settings/notifications"
              />
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
