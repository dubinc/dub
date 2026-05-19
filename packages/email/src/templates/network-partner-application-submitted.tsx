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

export default function NetworkPartnerApplicationSubmitted({
  name,
  email = "panic@thedis.co",
}: {
  name?: string | null;
  email: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>Dub Partner Network application submitted</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-8 max-w-[600px] px-8 py-8">
            <Section className="mt-2">
              <Img src={DUB_WORDMARK} width="61" height="32" alt="Dub" />
            </Section>

            <Heading className="mx-0 mb-8 mt-10 p-0 text-xl font-semibold text-neutral-900">
              Dub Partner Network application submitted
            </Heading>

            <Text className="text-sm leading-6 text-neutral-600">
              {name ? `Hi ${name}, t` : "T"}hanks for applying to the{" "}
              <strong>Dub Partner Network</strong>!
            </Text>

            <Text className="text-sm leading-6 text-neutral-600">
              Your application is now under review, and you are one step closer
              to partnering with world-class companies like Framer, Superhuman,
              Beehiiv, and many more.
            </Text>

            <Text className="text-sm leading-6 text-neutral-600">
              We will review your application within 5 to 7 business days, and
              you will receive an email after review.
            </Text>

            <Section className="mb-10 mt-8">
              <Link
                className="rounded-lg bg-neutral-900 px-6 py-3 text-[13px] font-medium text-white no-underline"
                href="https://partners.dub.co"
              >
                View dashboard
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
