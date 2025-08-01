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

export default function DomainRenewed({
  email = "panic@thedis.co",
  workspace = {
    slug: "acme",
  },
  domains = [
    {
      slug: "getacme.link",
    },
    {
      slug: "example.link",
    },
  ],
  expiresAt = new Date(),
}: {
  email: string;
  workspace: {
    slug: string;
  };
  domains: {
    slug: string;
  }[];
  expiresAt: Date;
}) {
  return (
    <Html>
      <Head />
      <Preview>Domain{domains.length > 1 ? "s" : ""} renewed</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] px-5 py-5">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>

            <Heading className="mx-0 mb-5 mt-10 p-0 text-lg font-semibold text-neutral-800">
              Domain{domains.length > 1 ? "s" : ""} renewed
            </Heading>

            <Text className="text-sm leading-6 text-neutral-600">
              The following {pluralize("domain", domains.length)} have been
              successfully renewed for 1 year:
            </Text>

            <Section>
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
                  </Row>

                  {index !== domains.length - 1 && (
                    <div className="my-2 w-full" />
                  )}
                </div>
              ))}
            </Section>

            <Text className="text-sm leading-6 text-neutral-600">
              These domains are now active until{" "}
              <span className="font-semibold text-black">
                {formatDate(expiresAt)}
              </span>
              .
            </Text>

            <Text className="text-sm leading-6 text-neutral-600">
              No further action is needed. Auto-renewal can be turned off from
              domain settings page.
            </Text>

            <Section className="my-10">
              <Link
                className="rounded-lg bg-black px-6 py-3 text-center text-[12px] font-semibold text-white no-underline"
                href={`https://app.dub.co/${workspace.slug}/settings/domains`}
              >
                Manage your domains
              </Link>
            </Section>

            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
