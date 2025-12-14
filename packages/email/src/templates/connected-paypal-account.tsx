import { DUB_WORDMARK } from "@dub/utils";
import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import { Footer } from "../components/footer";

export default function ConnectedPaypalAccount({
  email = "panic@thedis.co",
  paypalEmail = "user@example.com",
}: {
  email: string;
  paypalEmail: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>Your PayPal account has been successfully connected</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mb-8 mt-6">
              <Img src={DUB_WORDMARK} width="65" height="32" alt="dub" />
            </Section>

            <Heading className="mx-0 p-0 text-lg font-medium text-neutral-800">
              Successfully connected PayPal account
            </Heading>

            <Text className="mb-6 text-sm leading-6 text-neutral-600">
              Great news! Your PayPal account has been successfully connected to
              your Dub partner account. You're all set to receive payouts.
            </Text>

            {/* PayPal Account Details Card */}
            <Section className="mb-6 rounded-lg border border-solid border-neutral-200 bg-neutral-50 p-5">
              <Row className="mb-4">
                <Column align="left">
                  <Img
                    src="https://assets.dub.co/misc/paypal-wordmark.png"
                    width="120"
                    height="30"
                    alt="PayPal"
                    className="mb-0"
                  />
                </Column>
              </Row>

              <Section className="mt-4 border-t border-solid border-neutral-200 pt-4">
                <Row>
                  <Column className="text-sm font-medium text-neutral-600">
                    Account Email
                  </Column>
                  <Column className="text-right text-sm font-semibold text-neutral-800">
                    {paypalEmail}
                  </Column>
                </Row>
              </Section>
            </Section>

            {/* Action Buttons */}
            <Section className="mb-6">
              <Link
                href="https://partners.dub.co/payouts"
                className="box-border block w-full rounded-md bg-black px-0 py-3 text-center text-sm font-medium leading-none text-white no-underline"
              >
                View payouts dashboard
              </Link>
            </Section>

            {/* Next Steps */}
            <Section>
              <Text className="mb-3 text-base font-semibold text-neutral-800">
                What's next?
              </Text>
              <Text className="mb-4 text-sm leading-6 text-gray-600">
                <strong className="font-medium text-black">
                  1. Complete your partner profile
                </strong>
                : If you haven't already,{" "}
                <Link
                  href="https://ship.dub.co/partner-profile"
                  className="font-semibold text-black underline underline-offset-4"
                >
                  complete your partner profile
                </Link>
                . This will help you stand out from other partners in our
                partner network.
              </Text>

              <Text className="mb-4 text-sm leading-6 text-gray-600">
                <strong className="font-medium text-black">
                  2. Join a program
                </strong>
                : If you haven't already, join an affiliate program and start
                earning commissions for your referrals
              </Text>

              <Text className="mb-4 text-sm leading-6 text-gray-600">
                <strong className="font-medium text-black">
                  3. Start sharing your links
                </strong>
                : Once you've joined a program, you can start sharing and
                creating additional referral links.
              </Text>

              <Text className="text-sm leading-6 text-gray-600">
                <strong className="font-medium text-black">
                  4. Track your performance
                </strong>
                : Monitor traffic and earnings with real-time analytics
              </Text>
            </Section>

            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
