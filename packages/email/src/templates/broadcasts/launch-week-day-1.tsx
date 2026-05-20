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

export default function DubLaunchWeekDay1({
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
        Reward partners for referring other partners, and see where your
        applications come from.
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
              Dub Launch Week Day 1
            </Heading>

            <Text className="mx-auto mb-8 mt-0 max-w-sm text-center text-base leading-6 text-neutral-600">
              Introducing Partner Referrals + Application Analytics
            </Text>

            <Text className="mx-0 mb-4 mt-0 text-sm leading-6 text-neutral-600">
              👋 Hey, it's Steven from Dub!
            </Text>
            <Text className="mx-0 mb-8 mt-0 text-sm leading-6 text-neutral-600">
              Today is <strong>Day 1 of our Spring Launch Week</strong>, where
              we'll be launching an exciting new feature for{" "}
              <a
                href="http://ship.dub.co/partners"
                className="font-medium text-black"
              >
                Dub Partners
              </a>{" "}
              every day – for 5 days straight!
            </Text>

            <Section className="mb-8 text-center">
              <Link
                href="https://ship.dub.co/partner-referrals"
                style={{ textDecoration: "none" }}
              >
                <Img
                  src="https://assets.dub.co/cms/partner-referrals.jpg"
                  width={560}
                  height={320}
                  alt="Partner Referrals"
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
              Introducing Partner Referrals
            </Heading>

            <Text className="mx-0 mb-4 mt-0 text-sm leading-6 text-neutral-600">
              You can now reward partners for referring other{" "}
              <strong>influencers, affiliates, and publishers</strong> to join
              your partner program.
            </Text>
            <Text className="mx-0 mb-4 mt-0 text-sm leading-6 text-neutral-600">
              There are two ways to reward partners for referrals: via a
              flat-fee or percentage commission.
            </Text>
            <Link
              href="https://ship.dub.co/partner-referrals"
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
              Learn more about Partner Referrals
            </Link>

            <Hr className="mx-0 my-6 w-full border border-neutral-200" />

            <Section className="mb-8 text-center">
              <Link
                href="https://ship.dub.co/application-analytics"
                style={{ textDecoration: "none" }}
              >
                <Img
                  src="https://assets.dub.co/cms/application-analytics-funnelchart.png"
                  width={560}
                  height={320}
                  alt="Application Analytics Funnel Chart"
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
              Application Analytics
            </Heading>

            <Text className="mx-0 mb-4 mt-0 text-sm leading-6 text-neutral-600">
              On top of this, we're also unveiling a powerful new Application
              Analytics dashboard to give you real-time visibility into which
              channels are driving the most applications to your program.
            </Text>

            <Section className="mt-4 text-center">
              <Link
                href="https://ship.dub.co/application-analytics"
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
                Learn more about Application Analytics
              </Link>
            </Section>

            <Hr className="mx-0 my-6 w-full border border-neutral-200" />

            <Text className="mx-0 mb-4 mt-0 text-sm leading-6 text-neutral-600">
              That's all for today! Stay tuned for the remaining days of our
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
