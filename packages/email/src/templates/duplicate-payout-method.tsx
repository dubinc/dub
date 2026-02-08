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

export default function DuplicatePayoutMethod({
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
      <Preview>
        Your payout method is already connected to another account
      </Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mb-8 mt-6">
              <Img src={DUB_WORDMARK} width="65" height="32" alt="dub" />
            </Section>

            <Heading className="mx-0 p-0 text-lg font-medium text-neutral-800">
              Duplicate payout method detected
            </Heading>

            <Text className="mb-6 text-sm leading-6 text-neutral-600">
              We've detected that the payout method you're trying to connect is
              already associated with another Dub partner account,{" "}
              <strong>
                which is against our{" "}
                <Link
                  href="https://dub.co/legal/partners"
                  className="font-semibold text-black underline"
                >
                  terms of service
                </Link>
                .
              </strong>
            </Text>

            {/* Payout Method Details Card */}
            <Section className="mb-6 rounded-lg border border-solid border-neutral-200 bg-neutral-50 p-4 pt-0">
              <Text className="mb-3 text-sm font-semibold text-neutral-800">
                Payout method details
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

            {/* What This Means Section */}
            <Section className="mb-6 rounded-lg border border-solid border-blue-200 bg-blue-50 px-4 py-2">
              <Text className="text-sm font-semibold text-blue-800">
                What does this mean?
              </Text>
              <Text className="text-sm leading-6 text-blue-700">
                For security reasons, each payout method can only be connected
                to one Dub partner account at a time. This helps us prevent
                fraud and ensure payments reach the correct recipient.
              </Text>
            </Section>

            {/* Next Steps */}
            <Section className="mb-4">
              <Text className="mb-3 text-base font-semibold text-neutral-800">
                Next Steps
              </Text>
              <Text className="mb-3 text-sm leading-6 text-neutral-600">
                <strong>1. Check your other accounts:</strong> This payout
                method might already be connected to another Dub partner account
                using a different email address.
              </Text>
              <Text className="mb-3 text-sm leading-6 text-neutral-600">
                <strong>2. Merge your partner accounts:</strong> If you have
                multiple partner accounts and need to consolidate them, we
                recommend{" "}
                <Link
                  href="https://dub.co/help/article/merging-partner-accounts"
                  className="font-semibold text-black underline"
                >
                  merging them in your Profile Settings
                </Link>{" "}
                as soon as possible.
              </Text>
            </Section>

            {/* Action Buttons */}
            <Section className="mb-6">
              <Link
                href="https://partners.dub.co/payouts"
                className="box-border block w-full rounded-md bg-black px-0 py-3 text-center text-sm font-medium leading-none text-white no-underline"
              >
                Update payout method
              </Link>
            </Section>

            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
