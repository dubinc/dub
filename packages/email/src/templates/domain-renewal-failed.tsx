import { DUB_WORDMARK, formatDate, pluralize } from "@dub/utils";
import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import { Footer } from "../components/footer";

export default function DomainRenewalFailed({
  email = "panic@thedis.co",
  workspace = {
    slug: "acme",
  },
  domains = [
    {
      slug: "getacme.link",
      expiresAt: new Date("2025-07-29"),
    },
    {
      slug: "example.link",
      expiresAt: new Date("2025-07-29"),
    },
  ],
}: {
  email: string;
  workspace: {
    slug: string;
  };
  domains: {
    slug: string;
    expiresAt: Date;
  }[];
}) {
  return (
    <Html>
      <Head />
      <Preview>Failed domain renewal payment</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] px-5 py-5">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>

            <Heading className="mx-0 mb-5 mt-10 p-0 text-lg font-semibold text-neutral-800">
              Failed domain renewal payment
            </Heading>

            <Text className="text-sm leading-6 text-neutral-600">
              We attempted to charge your card to renew the following{" "}
              {pluralize("domain", domains.length)} but it failed. We will try
              again in 3 days.
            </Text>

            <Section>
              <Row className="pb-2">
                <Column align="left" className="text-sm text-neutral-500">
                  Domain
                </Column>
                <Column align="right" className="text-sm text-neutral-500">
                  Expires on
                </Column>
              </Row>

              {domains.map((domain, index) => (
                <div key={index}>
                  <Row>
                    <Column align="left" className="text-sm font-medium">
                      <Link
                        href={domain.slug}
                        className="font-semibold text-black underline"
                      >
                        {domain.slug}
                      </Link>
                    </Column>
                    <Column
                      align="right"
                      className="text-sm text-neutral-600"
                      suppressHydrationWarning
                    >
                      {formatDate(domain.expiresAt)}
                    </Column>
                  </Row>

                  {index !== domains.length - 1 && (
                    <div className="my-2 w-full" />
                  )}
                </div>
              ))}
            </Section>

            <Text className="text-sm leading-6 text-neutral-600">
              If you don't want to renew your{" "}
              {pluralize("domain", domains.length)}, turn off auto-renewal in
              your{" "}
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
