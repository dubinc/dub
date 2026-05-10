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

export default function NetworkPartnerApplicationRejected({
  name,
  email = "panic@thedis.co",
}: {
  name?: string | null;
  email: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>Dub Partner Network application update</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-8 max-w-[600px] px-8 py-8">
            <Section className="mt-2">
              <Img src={DUB_WORDMARK} width="61" height="32" alt="Dub" />
            </Section>

            <Heading className="mx-0 mb-8 mt-10 p-0 text-xl font-semibold text-neutral-900">
              Dub Partner Network application update
            </Heading>

            <Text className="text-sm leading-6 text-neutral-600">
              {name ? `Hi ${name}, t` : "T"}hanks for your interest in joining
              the <strong>Dub Partner Network</strong>.
            </Text>

            <Text className="text-sm leading-6 text-neutral-600">
              After a thorough review, we're sorry to say that we are unable to
              approve your application at this time.
            </Text>

            <Text className="text-sm leading-6 text-neutral-600">
              Unfortunately, we cannot provide individual feedback about your
              application. We encourage you to keep improving on your profile
              and reapply in the future.
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
