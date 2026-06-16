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

export default function PartnerAccountMergeFailed({
  email = "panic@thedis.co",
}: {
  email: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>We couldn't merge your Dub partner accounts</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] px-10 py-5">
            <Section className="mb-8 flex items-center">
              <Img
                src={DUB_WORDMARK}
                height="32"
                alt="Dub"
                className="mr-auto"
              />
            </Section>

            <Heading className="p-0 text-xl font-semibold text-black">
              We couldn't merge your partner accounts
            </Heading>

            <Text className="text-base text-neutral-600">
              We ran into an issue while merging your Dub partner accounts and
              the merge could not be completed. Please do not try again on your
              own — contact support and we'll help you resolve this.
            </Text>

            <Text className="text-base text-neutral-600">
              <Link href="https://dub.co/support">Contact support</Link>
            </Text>

            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
