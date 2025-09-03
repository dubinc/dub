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
}: {
  name: string | null;
  email: string;
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
              Time to start earning rewards by referring your audience to the
              brands you work with.
            </Text>

            <Hr />

            <Heading className="mx-0 my-6 p-0 text-lg font-semibold text-black">
              Getting started
            </Heading>

            <Text className="mb-4 text-sm leading-6 text-gray-600">
              <strong className="font-medium text-black">
                1. Join a program
              </strong>
              : If you haven't already, join an affiliate program, or enroll in
              our own{" "}
              <Link
                href="https://partners.dub.co/programs/dub/apply"
                className="font-semibold text-black underline underline-offset-4"
              >
                Dub Affiliate Program
              </Link>{" "}
              to earn 30% for every sale you refer.
            </Text>

            <Text className="mb-4 text-sm leading-6 text-gray-600">
              <strong className="font-medium text-black">
                2. Create referral links
              </strong>
              : Once you've joined a program, you can start sharing and creating
              additional referral links.
            </Text>

            <Text className="mb-4 text-sm leading-6 text-gray-600">
              <strong className="font-medium text-black">
                3. Track your performance
              </strong>
              : Monitor traffic and earnings with real-time analytics
            </Text>

            <Text className="mb-8 text-sm leading-6 text-gray-600">
              <strong className="font-medium text-black">
                4. Set up payouts
              </strong>
              :{" "}
              <Link
                href="https://partners.dub.co/payouts"
                className="font-semibold text-black underline underline-offset-4"
              >
                Connect a payout method
              </Link>{" "}
              to get paid for your referrals.
            </Text>

            <Section className="mb-8">
              <Link
                className="rounded-lg bg-black px-6 py-3 text-center text-[12px] font-semibold text-white no-underline"
                href="https://partners.dub.co"
              >
                Go to your dashboard
              </Link>
            </Section>

            <Footer email={email} marketing />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
