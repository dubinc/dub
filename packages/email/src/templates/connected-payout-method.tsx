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

export default function ConnectedPayoutMethod({
  email = "panic@thedis.co",
  payoutMethod = {
    account_holder_name: "Brendon Urie",
    bank_name: "BANK OF AMERICA, N.A.",
    last4: "1234",
    routing_number: "1234567890",
  },
}: {
  email: string;
  payoutMethod: {
    account_holder_name: string | null;
    bank_name: string | null;
    last4: string;
    routing_number: string | null;
  };
}) {
  return (
    <Html>
      <Head />
      <Preview>Your payout method has been successfully connected</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mb-8 mt-6">
              <Img src={DUB_WORDMARK} width="65" height="32" alt="dub" />
            </Section>

            <Heading className="mx-0 p-0 text-lg font-medium text-neutral-800">
              Successfully connected payout method
            </Heading>

            <Text className="mb-6 text-sm leading-6 text-neutral-600">
              Great news! Your bank account has been successfully connected to
              your Dub partner account. You're all set to receive payouts.
            </Text>

            {/* Payout Method Details Card */}
            <Section className="mb-6 rounded-lg border border-solid border-neutral-200 bg-neutral-50 p-4 pt-0">
              <Text className="mb-3 text-sm font-semibold text-neutral-800">
                Connected payout method
              </Text>

              {payoutMethod.account_holder_name && (
                <Row className="mb-2">
                  <Column className="text-sm text-neutral-600">
                    Account Holder
                  </Column>
                  <Column className="text-right text-sm font-medium text-neutral-800">
                    {payoutMethod.account_holder_name}
                  </Column>
                </Row>
              )}

              {payoutMethod.bank_name && (
                <Row className="mb-2">
                  <Column className="text-sm text-neutral-600">
                    Bank Name
                  </Column>
                  <Column className="text-right text-sm font-medium text-neutral-800">
                    {payoutMethod.bank_name}
                  </Column>
                </Row>
              )}

              <Row className="mb-2">
                <Column className="text-sm text-neutral-600">
                  Account Number
                </Column>
                <Column className="text-right text-sm font-medium text-neutral-800">
                  •••• {payoutMethod.last4}
                </Column>
              </Row>

              {payoutMethod.routing_number && (
                <Row>
                  <Column className="text-sm text-neutral-600">
                    Routing Number
                  </Column>
                  <Column className="text-right text-sm font-medium text-neutral-800">
                    {payoutMethod.routing_number}
                  </Column>
                </Row>
              )}
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
