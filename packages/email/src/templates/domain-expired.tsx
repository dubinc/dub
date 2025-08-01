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

export default function DomainExpired({
  email = "panic@thedis.co",
  workspace = {
    name: "Acme, Inc",
    slug: "acme",
  },
  domain = {
    slug: "getacme.link",
  },
}: {
  email: string;
  workspace: {
    name: string;
    slug: string;
  };
  domain: {
    slug: string;
  };
}) {
  return (
    <Html>
      <Head />
      <Preview>Domain expiration</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] px-5 py-5">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>

            <Heading className="mx-0 mb-5 mt-10 p-0 text-lg font-semibold text-neutral-800">
              Domain expiration
            </Heading>

            <Text className="text-sm leading-6 text-neutral-600">
              The domain{" "}
              <Link
                href={domain.slug}
                className="font-semibold text-black underline"
              >
                {domain.slug}
              </Link>{" "}
              has expired and is no longer available to use with your workspace{" "}
              <span className="font-semibold text-black">{workspace.name}</span>
              .
            </Text>

            <Text className="text-sm leading-6 text-neutral-600">
              If you own the domain again in the future, you can add it to your
              workspace anytime in the{" "}
              <Link
                href={`https://app.dub.co/${workspace.slug}/links/domains`}
                className="font-semibold text-black underline"
              >
                domain settings page
              </Link>
              .
            </Text>

            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
