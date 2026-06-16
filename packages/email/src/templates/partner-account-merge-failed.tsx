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
              We ran into an issue while merging your Dub partner accounts. Both
              accounts are unchanged - no data was merged or deleted.
            </Text>

            <Text className="text-base text-neutral-600">
              Please <Link href="https://dub.co/support">contact support</Link>{" "}
              and we'll help you complete the merge.
            </Text>

            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
