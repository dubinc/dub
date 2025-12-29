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
import { Footer } from "../components/footer";

export default function WelcomeEmailPartner({
  name = "Brendon Urie",
  email = "panic@thedis.co",
  unsubscribeUrl,
}: {
  name: string | null;
  email: string;
  unsubscribeUrl: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to Dub Partners</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>
            <Heading className="mx-0 my-7 p-0 text-xl font-semibold text-black">
              Welcome {name || "to Dub Partners"}!
            </Heading>
            <Text className="mb-8 text-sm leading-6 text-gray-600">
              We're excited to have you onboard. Time to start earning rewards
              by referring your audience to the brands you work with.
            </Text>

            <Hr />

            <Heading className="mx-0 my-6 p-0 text-lg font-semibold text-black">
              Getting started
            </Heading>

            <Text className="mb-4 text-sm leading-6 text-gray-600">
              <strong className="font-medium text-black">
                1. Complete your partner profile
              </strong>
              : Start by{" "}
              <Link
                href="https://ship.dub.co/partner-profile"
                className="font-semibold text-black underline underline-offset-4"
              >
                completing your partner profile
              </Link>
              . This will help you stand out from other partners in our partner
              network.
            </Text>

            <Text className="mb-4 text-sm leading-6 text-gray-600">
              <strong className="font-medium text-black">
                2. Set up payouts
              </strong>
              :{" "}
              <Link
                href="https://ship.dub.co/connect-payouts"
                className="font-semibold text-black underline underline-offset-4"
              >
                Connect a payout method
              </Link>{" "}
              to get paid for your referrals. Your payout bank account must
              match your local currency for compliance reasons. E.g. if you're
              based in the UK, you will need to connect a GBP bank account to
              receive payouts.{" "}
              <Link
                href="https://ship.dub.co/payouts-guide"
                className="font-semibold text-black underline underline-offset-4"
              >
                Learn more ↗
              </Link>
            </Text>

            <Text className="mb-4 text-sm leading-6 text-gray-600">
              <strong className="font-medium text-black">
                3. Join a program
              </strong>
              : If you haven't already, join an affiliate program and start
              earning commissions for your referrals
            </Text>

            <Text className="mb-4 text-sm leading-6 text-gray-600">
              <strong className="font-medium text-black">
                4. Start sharing your links
              </strong>
              : Once you've joined a program, you can start sharing and creating
              additional referral links.
            </Text>

            <Text className="mb-8 text-sm leading-6 text-gray-600">
              <strong className="font-medium text-black">
                5. Track your performance
              </strong>
              : Monitor traffic and earnings with real-time analytics
            </Text>

            <Section className="mb-8">
              <Link
                className="rounded-lg bg-black px-6 py-3 text-center text-[12px] font-semibold text-white no-underline"
                href="https://ship.dub.co/partners-dashboard"
              >
                Go to your dashboard
              </Link>
            </Section>

            <Footer email={email} marketing unsubscribeUrl={unsubscribeUrl} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
