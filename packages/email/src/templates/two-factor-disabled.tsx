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

export default function TwoFactorDisabled({
  email = "panic@thedis.co",
}: {
  email: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>Two Factor authentication disabled</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>

            <Heading className="mx-0 my-7 p-0 text-xl font-medium text-black">
              Two Factor authentication disabled
            </Heading>

            <Text className="text-sm leading-6 text-black">
              Two-factor authentication (2FA) was successfully disabled. If you
              did not make this change, contact{" "}
              <Link href="mailto:support@dub.co">Support</Link> immediately.
            </Text>

            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
