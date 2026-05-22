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

export default function DubLaunchWeekDay5({
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
        Refer other partners to join the Dub Partner Network and get rewarded
        when they start earning on Dub.
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
              Dub Launch Week Day 5
            </Heading>

            <Text className="mx-auto mb-8 mt-0 max-w-sm text-center text-base leading-6 text-neutral-600">
              Introducing the Dub Network Referral Bonus
            </Text>

            <Text className="mx-0 mb-4 mt-0 text-sm leading-6 text-neutral-600">
              👋 Hey, it's Steven from Dub!
            </Text>
            <Text className="mx-0 mb-8 mt-0 text-sm leading-6 text-neutral-600">
              Today is <strong>Day 5 of our Spring Launch Week</strong>, where
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
                href="https://ship.dub.co/network-referral"
                style={{ textDecoration: "none" }}
              >
                <Img
                  src="https://assets.dub.co/cms/network-referral-bonus.jpg"
                  width={560}
                  height={320}
                  alt="Dub Network Referral Bonus"
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
              Introducing the Dub Network Referral Bonus
            </Heading>

            <Text className="mx-0 mb-4 mt-0 text-sm leading-6 text-neutral-600">
              You can now refer other affiliates/creators/publishers to join the
              Dub Partner Network and get rewarded when they start earning on
              Dub.
            </Text>
            <Text className="mx-0 mb-4 mt-0 text-sm leading-6 text-neutral-600">
              When a partner you referred starts receiving payouts from the
              programs they work with, you'll earn 50% of their payout fees for
              up to 12 months.
            </Text>
            <Link
              href="https://ship.dub.co/network-referral"
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
              Learn more about the Dub Network Referral Bonus
            </Link>

            <Hr className="mx-0 my-6 w-full border border-neutral-200" />

            <Text className="mx-0 mb-4 mt-0 text-sm leading-6 text-neutral-600">
              That's all for our Spring Launch Week! Thanks for joining us for 5
              days of exciting new features – please let us know if you have any
              feedback or questions.
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
