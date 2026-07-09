import { DUB_WORDMARK } from "@dub/utils";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import { Footer } from "../../components/footer";

export default function DubLaunchWeekDay4({
  email = "panic@thedis.co",
  unsubscribeUrl = "https://app.dub.co/account/settings",
}: {
  email: string;
  unsubscribeUrl: string;
}) {
  return (
    <Html>
      <Head>
        <style>{`
          @media only screen and (max-width: 600px) {
            .email-container {
              padding-left: 16px !important;
              padding-right: 16px !important;
            }
          }
        `}</style>
      </Head>
      <Preview>
        Manage your partner program with Claude, Perplexity, Codex, or the AI
        agent of your choice using our new MCP server.
      </Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="email-container mx-auto my-10 max-w-[600px] px-10 py-5">
            <Section className="mt-2 text-center">
              <Img
                src={DUB_WORDMARK}
                width="65"
                height="32"
                alt="Dub"
                style={{ display: "block", margin: "0 auto" }}
              />
            </Section>

            <Heading className="mx-0 mb-2 mt-8 p-0 text-center text-2xl font-semibold text-black">
              Dub Launch Week Day 4
            </Heading>

            <Text className="mx-auto mb-8 mt-0 max-w-sm text-center text-base leading-6 text-neutral-600">
              Introducing the Dub MCP Server + Platform Logs
            </Text>

            <Text className="mx-0 mb-4 mt-0 text-sm leading-6 text-neutral-600">
              👋 Hey, it's Steven from Dub!
            </Text>
            <Text className="mx-0 mb-8 mt-0 text-sm leading-6 text-neutral-600">
              Today is <strong>Day 4 of our Spring Launch Week</strong>, where
              we'll be launching an exciting new feature for{" "}
              <Link
                href="http://ship.dub.co/partners"
                className="font-medium text-black underline"
              >
                Dub Partners
              </Link>{" "}
              every day – for 5 days straight!
            </Text>

            <Section className="mb-8 text-center">
              <Link
                href="https://ship.dub.co/mcp"
                style={{ textDecoration: "none" }}
              >
                <Img
                  src="https://assets.dub.co/cms/mcp-logs.jpg"
                  width={560}
                  height={320}
                  alt="Dub MCP Server"
                  style={{
                    display: "block",
                    maxWidth: "100%",
                    height: "auto",
                    margin: "0 auto",
                    borderRadius: "8px",
                  }}
                />
              </Link>
            </Section>

            <Heading className="mx-0 mb-3 mt-0 p-0 text-lg font-semibold text-black">
              Introducing the Dub MCP Server
            </Heading>

            <Text className="mx-0 mb-4 mt-0 text-sm leading-6 text-neutral-600">
              Leverage our new MCP server to manage your partner program with
              Claude, Perplexity, Codex, or the AI agent of your choice.
            </Text>
            <Text className="mx-0 mb-2 mt-0 text-sm leading-6 text-neutral-600">
              Here are some of the supported tools:
            </Text>
            <Text className="mx-0 mb-1 mt-0 pl-4 text-sm leading-6 text-neutral-600">
              • <strong>Partners</strong> — Create partners, list all partners,
              deactivate, or ban partners from your program
            </Text>
            <Text className="mx-0 mb-1 mt-0 pl-4 text-sm leading-6 text-neutral-600">
              • <strong>Partner applications</strong> — List, approve, and
              reject pending partner applications
            </Text>
            <Text className="mx-0 mb-4 mt-0 pl-4 text-sm leading-6 text-neutral-600">
              • <strong>Commissions</strong> — List and update commissions (e.g.
              for refunds or fraud)
            </Text>
            <Link
              href="https://ship.dub.co/mcp"
              className="block w-full rounded-lg bg-neutral-900 py-2.5 text-center text-sm font-medium text-white no-underline"
              style={{
                backgroundColor: "#171717",
                color: "#ffffff",
                borderRadius: "8px",
                padding: "10px 16px",
                textDecoration: "none",
                fontWeight: "500",
                fontSize: "14px",
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              Learn more about the Dub MCP Server
            </Link>

            <Hr className="mx-0 my-6 w-full border border-neutral-200" />

            <Section className="mb-8 text-center">
              <Link
                href="https://ship.dub.co/platform-logs"
                style={{ textDecoration: "none" }}
              >
                <Img
                  src="https://assets.dub.co/cms/platform-logs.jpg"
                  width={560}
                  height={320}
                  alt="Dub Platform Logs"
                  style={{
                    display: "block",
                    maxWidth: "100%",
                    height: "auto",
                    margin: "0 auto",
                    borderRadius: "8px",
                  }}
                />
              </Link>
            </Section>

            <Heading className="mx-0 mb-3 mt-0 p-0 text-lg font-semibold text-black">
              Dub Platform Logs
            </Heading>

            <Text className="mx-0 mb-4 mt-0 text-sm leading-6 text-neutral-600">
              We're also releasing a new{" "}
              <Link
                href="https://ship.dub.co/logs"
                className="font-medium text-black underline"
              >
                Logs page
              </Link>{" "}
              to give you real-time visibility into the requests your agent (or
              your team) makes to your Dub workspace.
            </Text>

            <Section className="mt-4 text-center">
              <Link
                href="https://ship.dub.co/platform-logs"
                className="block w-full rounded-lg bg-neutral-900 py-2.5 text-center text-sm font-medium text-white no-underline"
                style={{
                  backgroundColor: "#171717",
                  color: "#ffffff",
                  borderRadius: "8px",
                  padding: "10px 16px",
                  textDecoration: "none",
                  fontWeight: "500",
                  fontSize: "14px",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              >
                Learn more about Platform Logs
              </Link>
            </Section>

            <Hr className="mx-0 my-6 w-full border border-neutral-200" />

            <Text className="mx-0 mb-4 mt-0 text-sm leading-6 text-neutral-600">
              That's all for Day 4! Stay tuned for the remaining days of our
              Spring Launch Week – see you tomorrow!
            </Text>
            <Text className="mx-0 mb-4 mt-0 text-sm leading-6 text-neutral-400">
              Steven from Dub.co
            </Text>

            <Section className="mx-auto max-w-[400px] text-center">
              <Footer email={email} marketing unsubscribeUrl={unsubscribeUrl} />
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
