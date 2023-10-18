import { DUB_LOGO, truncate } from "@dub/utils";
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
import Footer from "./components/footer";

export default function MonitoringAlerts({
  email = "panic@thedis.co",
  projectName = "Acme",
  projectSlug = "acme",
  errorLinks = [
    {
      link: "acme.com/sales",
      status: 404,
      error: "Not Found",
    },
    {
      link: "acme.com/instagram",
      status: 500,
      error: "Internal Server Error",
    },
  ],
}: {
  email: string;
  projectName: string;
  projectSlug: string;
  errorLinks: {
    link: string;
    status: number;
    error: string;
  }[];
}) {
  return (
    <Html>
      <Head />
      <Preview>Dub Monitoring Alert for {projectName}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[500px] rounded border border-solid border-gray-200 px-10 py-5">
            <Section className="mt-8">
              <Img
                src={DUB_LOGO}
                width="40"
                height="40"
                alt="Dub"
                className="mx-auto my-0"
              />
            </Section>
            <Heading className="mx-0 my-7 p-0 text-center text-xl font-semibold text-black">
              Dub Monitoring Alert for {projectName}
            </Heading>
            <Text className="text-sm leading-6 text-black">
              Some of your links on Dub are returning errors. Please check the
              links below:
            </Text>
            <Section>
              <Row className="pb-2">
                <Column align="left" className="text-sm text-gray-500">
                  Link
                </Column>
                <Column align="right" className="text-sm text-gray-500">
                  Status Code
                </Column>
              </Row>
              {errorLinks.map(({ link, status, error }, index) => (
                <div key={index}>
                  <Row>
                    <Column align="left" className="text-sm font-medium">
                      {truncate(link, 30)}
                    </Column>
                    <Column align="right" className="text-sm text-gray-600">
                      {status}
                    </Column>
                  </Row>
                  {index !== errorLinks.length - 1 && (
                    <Hr className="my-2 w-full border border-gray-200" />
                  )}
                </div>
              ))}
            </Section>
            <Section className="my-8 text-center">
              <Link
                className="rounded-full bg-black px-6 py-3 text-center text-[12px] font-semibold text-white no-underline"
                href={`https://app.dub.co/${projectSlug}/settings/monitoring`}
              >
                See more details
              </Link>
            </Section>
            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
