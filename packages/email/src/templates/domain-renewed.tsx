import { DUB_WORDMARK, formatDate } from "@dub/utils";
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

export default function DomainRenewed({
  email = "panic@thedis.co",
  domain = {
    slug: "getacme.link",
    expiresAt: new Date("2026-07-29"),
  },
}: {
  email: string;
  domain: {
    slug: string;
    expiresAt: Date;
  };
}) {
  return (
    <Html>
      <Head />
      <Preview>Domain renewed</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] px-5 py-5">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>

            <Heading className="mx-0 mb-5 mt-10 p-0 text-lg font-semibold text-neutral-800">
              Domain renewed
            </Heading>

            <Text className="text-sm leading-6 text-neutral-600">
              The domain{" "}
              <Link
                href={domain.slug}
                className="font-semibold text-black underline"
              >
                {domain.slug}
              </Link>{" "}
              has been renewed for 1 year and has been processed. This
              registration expires on{" "}
              <span className="font-semibold text-black">
                {formatDate(domain.expiresAt)}
              </span>
              .
            </Text>

            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
