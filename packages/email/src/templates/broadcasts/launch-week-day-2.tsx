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

export default function DubLaunchWeekDay2({
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
        Segment your partners by tags and build custom reports to measure the
        ROI of your partner program.
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
              Dub Launch Week Day 2
            </Heading>

            <Text className="mx-auto mb-8 mt-0 max-w-sm text-center text-base leading-6 text-neutral-600">
              Introducing Partner Tags – segment your partners and build custom
              reports
            </Text>

            <Text className="mx-0 mb-4 mt-0 text-sm leading-6 text-neutral-600">
              👋 Hey, it's Steven from Dub!
            </Text>
            <Text className="mx-0 mb-8 mt-0 text-sm leading-6 text-neutral-600">
              Today is <strong>Day 2 of our Spring Launch Week</strong>, where
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
                href="https://ship.dub.co/partner-tags"
                style={{ textDecoration: "none" }}
              >
                <Img
                  src="https://assets.dub.co/cms/partner-tags.jpg"
                  width={560}
                  height={320}
                  alt="Partner Tags"
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
              Introducing Partner Tags
            </Heading>

            <Text className="mx-0 mb-4 mt-0 text-sm leading-6 text-neutral-600">
              You can now segment your partners by tags and build custom reports
              to measure the ROI of your partner program.
            </Text>
            <Text className="mx-0 mb-2 mt-0 text-sm leading-6 text-neutral-600">
              Some examples include:
            </Text>
            <Text className="mx-0 mb-1 mt-0 pl-4 text-sm leading-6 text-neutral-600">
              • Partner types –{" "}
              <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-neutral-800">
                Influencers
              </code>
              ,{" "}
              <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-neutral-800">
                Creators
              </code>
              ,{" "}
              <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-neutral-800">
                Affiliates
              </code>
              ,{" "}
              <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-neutral-800">
                Publishers
              </code>
            </Text>
            <Text className="mx-0 mb-1 mt-0 pl-4 text-sm leading-6 text-neutral-600">
              • Partner status –{" "}
              <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-neutral-800">
                High performer
              </code>
              ,{" "}
              <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-neutral-800">
                Needs follow up
              </code>
            </Text>
            <Text className="mx-0 mb-4 mt-0 pl-4 text-sm leading-6 text-neutral-600">
              • Custom campaigns –{" "}
              <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-neutral-800">
                Black Friday
              </code>
              ,{" "}
              <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-neutral-800">
                Webinar cohort
              </code>
            </Text>
            <Link
              href="https://ship.dub.co/partner-tags"
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
              Learn more about Partner Tags
            </Link>

            <Hr className="mx-0 my-6 w-full border border-neutral-200" />

            <Section className="mb-8 text-center">
              <Link
                href="https://ship.dub.co/partner-tags#filtering-program-analytics-by-partner-tags"
                style={{ textDecoration: "none" }}
              >
                <Img
                  src="https://assets.dub.co/cms/filter-analytics-partner-tag.png"
                  width={560}
                  height={320}
                  alt="Filter analytics by partner tag"
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
              Filter analytics by partner tag
            </Heading>

            <Text className="mx-0 mb-4 mt-0 text-sm leading-6 text-neutral-600">
              You can also filter your program analytics by partner tags, which
              lets you measure the success of your campaign at a more granular
              level.
            </Text>

            <Section className="mt-4 text-center">
              <Link
                href="https://ship.dub.co/partner-tags#filtering-program-analytics-by-partner-tags"
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
                Learn more
              </Link>
            </Section>

            <Hr className="mx-0 my-6 w-full border border-neutral-200" />

            <Text className="mx-0 mb-4 mt-0 text-sm leading-6 text-neutral-600">
              That's all for Day 2! Stay tuned for the remaining days of our
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
