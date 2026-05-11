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

export default function NetworkPartnerApplicationApproved({
  name,
  email = "panic@thedis.co",
}: {
  name?: string | null;
  email: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>
        Your application to join the Dub Network has been approved.
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

            <Section className="mb-8 mt-8 text-center">
              <Img
                src="https://assets.dub.co/misc/program-marketplace-email-header.jpg"
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
            </Section>

            <Heading className="mx-0 mb-4 mt-0 p-0 text-center text-2xl font-semibold text-black">
              Congratulations{name ? `, ${name}!` : "!"}
            </Heading>

            <Text className="mx-auto mb-4 mt-0 max-w-[420px] text-center text-base leading-7 text-neutral-600">
              Your application to join the <strong>Dub Network</strong> has been
              approved. You can now apply to more programs on the marketplace,
              and get discovered by brands.
            </Text>

            <Section className="mb-8 text-center">
              <Link
                href="https://partners.dub.co/programs/marketplace"
                className="box-border inline-block rounded-lg bg-neutral-900 px-6 py-3 text-center text-sm font-medium text-white no-underline"
              >
                View the marketplace
              </Link>
            </Section>

            <Footer
              email={email}
              notificationSettingsUrl="https://partners.dub.co/profile/notifications"
            />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
