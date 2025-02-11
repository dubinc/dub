import { DUB_WORDMARK, linkConstructor, truncate } from "@dub/utils";
import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Hr,
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

const MAX_ERROR_LINKS = 20;

export function LinksImportErrors({
  email,
  provider = "CSV",
  errorLinks,
  workspaceName,
  workspaceSlug,
}: {
  email: string;
  provider: "CSV" | "Bitly" | "Short.io" | "Rebrandly";
  errorLinks: {
    domain: string;
    key: string;
    error: string;
  }[];
  workspaceName: string;
  workspaceSlug: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>Your {provider} links have been imported</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[500px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mt-8">
              <Img
                src={DUB_WORDMARK}
                height="40"
                alt="Dub"
                className="mx-auto my-0"
              />
            </Section>
            <Heading className="mx-0 my-7 p-0 text-center text-xl font-semibold text-black">
              Some {provider} links have failed to import
            </Heading>
            <Text className="text-sm leading-6 text-black">
              The following{" "}
              {Intl.NumberFormat("en-us").format(errorLinks.length)} links from{" "}
              {provider} failed to import into your Dub.co workspace,{" "}
              <Link
                href={`https://app.dub.co/${workspaceSlug}`}
                className="font-medium text-blue-600 no-underline"
              >
                {workspaceName}↗
              </Link>
              .
            </Text>
            <Section>
              <Row className="pb-2">
                <Column align="left" className="text-sm text-neutral-500">
                  Link
                </Column>
                <Column align="right" className="text-sm text-neutral-500">
                  Error
                </Column>
              </Row>
              {errorLinks
                .slice(0, MAX_ERROR_LINKS)
                .map(({ domain, key, error }, index) => (
                  <div key={index}>
                    <Row>
                      <Column align="left" className="text-sm font-medium">
                        {truncate(
                          linkConstructor({ domain, key, pretty: true }),
                          40,
                        )}
                      </Column>
                      <Column
                        align="right"
                        className="text-sm text-neutral-600"
                        suppressHydrationWarning
                      >
                        {error}
                      </Column>
                    </Row>
                    {index !== errorLinks.length - 1 && (
                      <Hr className="my-2 w-full border border-neutral-200" />
                    )}
                  </div>
                ))}
            </Section>
            {errorLinks.length > MAX_ERROR_LINKS && (
              <Section className="my-8 text-center">
                <Text className="text-sm leading-6 text-black">
                  ...and {errorLinks.length - MAX_ERROR_LINKS} more errors
                </Text>
              </Section>
            )}
            <Text className="text-sm leading-6 text-black">
              Please reply to this email for additional help with your CSV
              import.
            </Text>
            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export default LinksImportErrors;
