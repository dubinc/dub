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
                filling out your partner profile
              </Link>{" "}
              and verifying your social platforms, which will allow you to start
              applying to programs on Dub.
            </Text>

            <Text className="mb-4 text-sm leading-6 text-gray-600">
              <strong className="font-medium text-black">
                2. Verify your identity
              </strong>
              : Next, you'll need to{" "}
              <Link
                href="https://ship.dub.co/partner-profile"
                className="font-semibold text-black underline underline-offset-4"
              >
                verify your identity
              </Link>
              . This will build trust with programs and improve your chances of
              being approved.
            </Text>

            <Text className="mb-4 text-sm leading-6 text-gray-600">
              <strong className="font-medium text-black">
                3. Join a program
              </strong>
              : Now that your profile is ready, you can start applying to
              programs via our{" "}
              <Link
                href="https://ship.dub.co/marketplace"
                className="font-semibold text-black underline underline-offset-4"
              >
                program marketplace
              </Link>{" "}
              and earn commissions for your referrals.
            </Text>

            <Text className="mb-4 text-sm leading-6 text-gray-600">
              <strong className="font-medium text-black">
                4. Set up payouts
              </strong>
              :{" "}
              <Link
                href="https://ship.dub.co/connect-payouts"
                className="font-semibold text-black underline underline-offset-4"
              >
                Connect a payout method
              </Link>{" "}
              to get paid for your referrals. Learn more about{" "}
              <Link
                href="https://dub.co/help/article/receiving-payouts"
                className="font-semibold text-black underline underline-offset-4"
              >
                receiving payouts on Dub
              </Link>
              .
            </Text>

            <Footer email={email} marketing unsubscribeUrl={unsubscribeUrl} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
