import { DUB_WORDMARK, nFormatter, smartTruncate } from "@dub/utils";
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
import { Link2, MousePointerClick } from "lucide-react";
import Footer from "./components/footer";

export default function ClicksSummary({
  email = "panic@thedis.co",
  appName = "Dub.co",
  appDomain = "dub.co",
  workspaceName = "Acme",
  workspaceSlug = "acme",
  totalClicks = 63689,
  createdLinks = 25,
  topLinks = [
    {
      link: "acmesuperlongdomain.com/instagram",
      clicks: 1820,
    },
    {
      link: "acmesuperlongdomain.com/super-long-path-that-is-way-too-long-and-should-be-truncated",
      clicks: 2187,
    },
    {
      link: "getacme.link",
      clicks: 1552,
    },
    {
      link: "acme.com/twitter",
      clicks: 1229,
    },
    {
      link: "acme.com/linkedin/more/path",
      clicks: 1055,
    },
  ],
}: {
  email: string;
  appName: string;
  appDomain: string;
  workspaceName: string;
  workspaceSlug: string;
  totalClicks: number;
  createdLinks: number;
  topLinks: {
    link: string;
    clicks: number;
  }[];
}) {
  const notificationSettingsUrl = `https://app.${appDomain}/${workspaceSlug}/settings/notifications`;

  return (
    <Html>
      <Head />
      <Preview>
        Your 30-day {appName} summary for {workspaceName}
      </Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[500px] rounded border border-solid border-gray-200 px-10 py-5">
            <Section className="mt-8">
              <Img
                src={DUB_WORDMARK}
                height="40"
                alt={appName}
                className="mx-auto my-0"
              />
            </Section>
            <Heading className="mx-0 my-7 p-0 text-center text-xl font-semibold text-black">
              Your 30-day {appName} summary for {workspaceName}
            </Heading>
            <Text className="text-sm leading-6 text-black">
              In the last 30 days, your {appName} workspace,{" "}
              <strong>{workspaceName}</strong> received{" "}
              <strong>{nFormatter(totalClicks)} link clicks</strong>. You also
              created <strong>{createdLinks} new links</strong> during that
              time.
            </Text>
            <Section>
              <Row>
                <Column align="center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-200">
                    <MousePointerClick className="h-5 w-5 text-blue-600" />
                  </div>
                  <p className="text-sm font-semibold text-black">
                    {nFormatter(totalClicks)} clicks
                  </p>
                </Column>
                <Column align="center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-200">
                    <Link2 className="h-5 w-5 text-green-600" />
                  </div>
                  <p className="text-sm font-semibold text-black">
                    {nFormatter(createdLinks)} new links
                  </p>
                </Column>
              </Row>
            </Section>
            {topLinks.length > 0 && (
              <>
                <Text className="text-sm leading-6 text-black">
                  Here are your top {topLinks.length} best performing links:
                </Text>
                <Section>
                  <Row className="pb-2">
                    <Column align="left" className="text-sm text-gray-500">
                      Link
                    </Column>
                    <Column align="right" className="text-sm text-gray-500">
                      Clicks
                    </Column>
                  </Row>
                  {topLinks.map(({ link, clicks }, index) => {
                    const [domain, ...pathParts] = link.split("/");
                    const path = pathParts.join("/") || "_root";
                    return (
                      <div key={index}>
                        <Row>
                          <Column align="left">
                            <Link
                              href={`https://app.dub.co/${workspaceSlug}/analytics?domain=${domain}&key=${path}`}
                              className="text-sm font-medium text-black underline"
                            >
                              {smartTruncate(link, 36)}↗
                            </Link>
                          </Column>
                          <Column
                            align="right"
                            className="text-sm text-gray-600"
                          >
                            {nFormatter(clicks)}
                          </Column>
                        </Row>
                        {index !== topLinks.length - 1 && (
                          <Hr className="my-2 w-full border border-gray-200" />
                        )}
                      </div>
                    );
                  })}
                </Section>
              </>
            )}
            {createdLinks === 0 ? (
              <>
                <Text className="text-sm leading-6 text-black">
                  It looks like you haven't created any links in the last 30
                  days. If there's anything that we can do to help, please reply
                  to this email to get in touch with us.
                </Text>

                <Section className="my-8 text-center">
                  <Link
                    className="rounded-full bg-black px-6 py-3 text-center text-[12px] font-semibold text-white no-underline"
                    href={`https://app.${appDomain}/${workspaceSlug}`}
                  >
                    Start creating links
                  </Link>
                </Section>
              </>
            ) : (
              <>
                <Text className="mt-10 text-sm leading-6 text-black">
                  You can view your full stats by clicking the button below.
                </Text>
                <Section className="my-8 text-center">
                  <Link
                    className="rounded-full bg-black px-6 py-3 text-center text-[12px] font-semibold text-white no-underline"
                    href={`https://app.${appDomain}/${workspaceSlug}/analytics?interval=30d`}
                  >
                    View my stats
                  </Link>
                </Section>
              </>
            )}
            <Footer
              email={email}
              notificationSettingsUrl={notificationSettingsUrl}
            />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
