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

export default function DubLaunchWeekDay3({
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
        You can now see a real-time analytics dashboard of your partner
        commissions on Dub.
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
              Dub Launch Week Day 3
            </Heading>

            <Text className="mx-auto mb-8 mt-0 max-w-sm text-center text-base leading-6 text-neutral-600">
              Introducing Commission Analytics – real-time analytics for your
              partner commissions
            </Text>

            <Text className="mx-0 mb-4 mt-0 text-sm leading-6 text-neutral-600">
              👋 Hey, it's Steven from Dub!
            </Text>
            <Text className="mx-0 mb-8 mt-0 text-sm leading-6 text-neutral-600">
              Today is <strong>Day 3 of our Spring Launch Week</strong>, where
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
                href="https://ship.dub.co/commission-analytics"
                style={{ textDecoration: "none" }}
              >
                <Img
                  src="https://assets.dub.co/cms/commission-analytics.jpg"
                  width={560}
                  height={320}
                  alt="Commission Analytics"
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
              Introducing Commission Analytics
            </Heading>

            <Text className="mx-0 mb-4 mt-0 text-sm leading-6 text-neutral-600">
              You can now see a real-time analytics dashboard of your partner
              commissions to measure your return on ad spend (ROAS) on Dub.
            </Text>
            <Text className="mx-0 mb-2 mt-0 text-sm leading-6 text-neutral-600">
              You are also able to see your:
            </Text>
            <Text className="mx-0 mb-1 mt-0 pl-4 text-sm leading-6 text-neutral-600">
              • Top partners by commissions
            </Text>
            <Text className="mx-0 mb-1 mt-0 pl-4 text-sm leading-6 text-neutral-600">
              • Top partner groups by commissions
            </Text>
            <Text className="mx-0 mb-4 mt-0 pl-4 text-sm leading-6 text-neutral-600">
              • Top partner tags by commissions
            </Text>
            <Link
              href="https://ship.dub.co/commission-analytics"
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
              Learn more about Commission Analytics
            </Link>

            <Hr className="mx-0 my-6 w-full border border-neutral-200" />

            <Text className="mx-0 mb-4 mt-0 text-sm leading-6 text-neutral-600">
              That's all for Day 3! Stay tuned for the remaining days of our
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
