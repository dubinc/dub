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

export default function ConnectPlatformsReminder({
  email = "panic@thedis.co",
  unsubscribeUrl = "https://partners.dub.co/account/settings",
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
        Verify your social platforms and get noticed by more programs
      </Preview>
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

            <Heading className="mx-auto mb-2 mt-8 max-w-[420px] text-center text-2xl font-semibold text-black">
              Verify your social platforms and get noticed by more programs
            </Heading>

            <Text className="mx-auto mb-8 mt-0 max-w-[420px] text-center text-base leading-6 text-neutral-600">
              Improve your reputation score in the Dub partner network by
              verifying your social platforms.
            </Text>

            <Section className="mb-8 text-center">
              <Link
                href="https://ship.dub.co/partner-profile"
                style={{ textDecoration: "none" }}
              >
                <Img
                  src="https://assets.dub.co/email-assets/connect-social-platforms.jpg"
                  width="500"
                  height="292"
                  alt="Connect your social platforms"
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
              Improve approval rates by 47%
            </Heading>

            <Text className="mx-auto mb-8 mt-0 max-w-[420px] text-center text-sm leading-6 text-neutral-600">
              Verified partners are 47% more likely to be approved by programs.
              You will also receive more invitations from some of our top
              programs to join their program and start earning.
            </Text>

            <Section className="mb-8 text-center">
              <Link
                href="https://ship.dub.co/partner-profile"
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
                Verify your social platforms now
              </Link>
            </Section>

            <Section className="mx-auto max-w-[400px] text-center">
              <Footer email={email} marketing unsubscribeUrl={unsubscribeUrl} />
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
