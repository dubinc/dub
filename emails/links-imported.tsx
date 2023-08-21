import {
  Body,
  Link,
  Container,
  Column,
  Row,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import { linkConstructor, timeAgo } from "../lib/utils";
import { DUB_LOGO } from "../lib/constants";
import Footer from "./components/footer";

export default function LinksImported({
  email = "panic@thedis.co",
  provider = "Bitly",
  count = 1020,
  links = [
    {
      domain: "ac.me",
      key: "sales",
      createdAt: new Date("2023-07-16T00:00:00.000Z"),
    },
    {
      domain: "ac.me",
      key: "instagram",
      createdAt: new Date("2023-07-01T00:00:00.000Z"),
    },
    {
      domain: "ac.me",
      key: "facebook",
      createdAt: new Date("2023-06-18T00:00:00.000Z"),
    },
    {
      domain: "ac.me",
      key: "twitter",
      createdAt: new Date("2023-06-01T00:00:00.000Z"),
    },
    {
      domain: "ac.me",
      key: "linkedin",
      createdAt: new Date("2023-05-16T00:00:00.000Z"),
    },
  ],
  projectName = "Acme",
  projectSlug = "acme",
  domains = ["ac.me"],
}: {
  email: string;
  provider: "Bitly" | "Short.io";
  count: number;
  links: {
    domain: string;
    key: string;
    createdAt: Date;
  }[];
  projectName: string;
  projectSlug: string;
  domains: string[];
}) {
  return (
    <Html>
      <Head />
      <Preview>Your {provider} links have been imported</Preview>
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
              Your {provider} links have been imported
            </Heading>
            <Text className="text-sm leading-6 text-black">
              We have successfully{" "}
              <strong>
                imported {Intl.NumberFormat("en-us").format(count)} links
              </strong>{" "}
              from {provider} into your Dub project,{" "}
              <Link
                href={`https://app.dub.co/${projectSlug}`}
                className="font-medium text-blue-600 no-underline"
              >
                {projectName}↗
              </Link>{" "}
              , for the domain{domains.length > 1 ? "s" : ""}{" "}
              <strong>{domains.join(", ")}</strong>.
            </Text>
            {links.length > 0 && (
              <Section>
                <Row className="pb-2">
                  <Column align="left" className="text-sm text-gray-500">
                    Link
                  </Column>
                  <Column align="right" className="text-sm text-gray-500">
                    Created
                  </Column>
                </Row>
                {links.map(({ domain, key, createdAt }, index) => (
                  <div key={index}>
                    <Row>
                      <Column align="left" className="text-sm font-medium">
                        {linkConstructor({ domain, key, pretty: true })}
                      </Column>
                      <Column align="right" className="text-sm text-gray-600">
                        {timeAgo(createdAt)}
                      </Column>
                    </Row>
                    {index !== links.length - 1 && (
                      <Hr className="my-2 w-full border border-gray-200" />
                    )}
                  </div>
                ))}
              </Section>
            )}
            {links.length > 5 && (
              <Section className="my-8 text-center">
                <Link
                  className="rounded-full bg-black px-6 py-3 text-center text-[12px] font-semibold text-white no-underline"
                  href={`https://app.dub.co/${projectSlug}`}
                >
                  View {Intl.NumberFormat("en-us").format(count - 5)} more links
                </Link>
              </Section>
            )}
            <Text className="text-sm leading-6 text-black">
              If you haven't already{" "}
              <Link
                href="https://dub.co/help/article/how-to-add-custom-domain#step-2-configure-your-domain"
                className="font-medium text-blue-600 no-underline"
              >
                configured your domain{domains.length > 1 ? "s" : ""}
              </Link>
              , you will need to do it before you can start using your links.
            </Text>
            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
