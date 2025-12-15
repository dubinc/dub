import { currencyFormatter, DUB_WORDMARK } from "@dub/utils";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import { Footer } from "../components/footer";

// Send this email to the partner when the Stripe payout fails
export default function PartnerStripePayoutFailed({
  email = "panic@thedis.co",
  accountUpdateUrl = "https://partners.dub.co/payouts",
  payout = {
    amount: 530000,
    currency: "usd",
    failureReason:
      "Your bank notified us that the bank account holder tax ID on file is incorrect.",
  },
}: {
  email: string;
  accountUpdateUrl: string;
  payout: {
    amount: number; // in cents
    currency: string;
    failureReason?: string | null;
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

            <Text>
              Please update your bank account details as soon as possible. A
              failed payout is automatically retried, so having accurate bank
              details on file ensures your payout can be successfully deposited.
            </Text>

            <Section className="my-8">
              <Link
                className="rounded-lg bg-neutral-900 px-6 py-3 text-[13px] font-medium text-white no-underline"
                href={accountUpdateUrl}
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
