import { currencyFormatter, DUB_WORDMARK } from "@dub/utils";
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

// Send this email to the partner when the Stripe payout fails
export default function PartnerStripePayoutFailed({
  email = "panic@thedis.co",
  payout = {
    amount: 530000,
    currency: "usd",
    failureReason:
      "Your bank notified us that the bank account holder tax ID on file is incorrect.",
  },
  bankAccount = {
    account_holder_name: "Brendon Urie",
    bank_name: "BANK OF AMERICA, N.A.",
    last4: "1234",
    routing_number: "1234567890",
  },
}: {
  email: string;
  payout: {
    amount: number; // in cents
    currency: string;
    failureReason?: string | null;
  };
  bankAccount?: {
    account_holder_name: string | null;
    bank_name: string | null;
    last4: string;
    routing_number: string | null;
  };
}) {
  const amountFormatted = currencyFormatter(payout.amount, {
    currency: payout.currency,
  });

  return (
    <Html>
      <Head />
      <Preview>Action Required - Your recent payout failed</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-8 max-w-[600px] px-8 py-8">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>

            <Heading className="mx-0 my-8 p-0 text-lg font-medium text-black">
              Your recent payout failed
            </Heading>

            <Text>
              We attempted to send your recent payout of{" "}
              <span className="font-semibold text-purple-600">
                {amountFormatted}
              </span>{" "}
              to your connected bank account, but the transaction failed.
            </Text>

            {payout.failureReason && (
              <Text className="text-sm leading-6 text-neutral-600">
                Reason:{" "}
                <span className="font-semibold italic text-neutral-800">
                  {payout.failureReason}
                </span>
              </Text>
            )}

            {bankAccount && (
              <Section className="my-6 rounded-lg border border-solid border-neutral-200 bg-neutral-50 p-4 pt-0">
                <Text className="mb-3 text-sm font-semibold text-neutral-800">
                  Current bank account
                </Text>

                {bankAccount.account_holder_name && (
                  <Row className="mb-2">
                    <Column className="text-sm text-neutral-600">
                      Account Holder
                    </Column>
                    <Column className="text-right text-sm font-medium text-neutral-800">
                      {bankAccount.account_holder_name}
                    </Column>
                  </Row>
                )}

                {bankAccount.bank_name && (
                  <Row className="mb-2">
                    <Column className="text-sm text-neutral-600">
                      Bank Name
                    </Column>
                    <Column className="text-right text-sm font-medium text-neutral-800">
                      {bankAccount.bank_name}
                    </Column>
                  </Row>
                )}

                <Row className="mb-2">
                  <Column className="text-sm text-neutral-600">
                    Account Number
                  </Column>
                  <Column className="text-right text-sm font-medium text-neutral-800">
                    •••• {bankAccount.last4}
                  </Column>
                </Row>

                {bankAccount.routing_number && (
                  <Row>
                    <Column className="text-sm text-neutral-600">
                      Routing Number
                    </Column>
                    <Column className="text-right text-sm font-medium text-neutral-800">
                      {bankAccount.routing_number}
                    </Column>
                  </Row>
                )}
              </Section>
            )}

            <Text>
              Please update your bank account details as soon as possible. A
              failed payout is automatically retried, so having accurate bank
              details on file ensures your payout can be successfully deposited.
            </Text>

            <Section className="my-8">
              <Link
                className="rounded-lg bg-neutral-900 px-6 py-3 text-[13px] font-medium text-white no-underline"
                href="https://partners.dub.co/payouts"
              >
                Update bank account
              </Link>
            </Section>

            <Text className="text-sm leading-6 text-neutral-600">
              If you have any questions, please reach out to us:{" "}
              <Link
                href="https://dub.co/contact/support"
                className="font-medium text-black underline"
              >
                https://dub.co/contact/support
              </Link>
            </Text>

            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
