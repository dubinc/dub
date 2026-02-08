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

// Send this email to the partner when the paypal payout fails
export default function PartnerPaypalPayoutFailed({
  program = {
    name: "Acme",
  },
  payout = {
    amount: 530000,
    failureReason: "This transaction was declined due to risk concerns.",
  },
  partner = {
    paypalEmail: "paypal@example.com",
  },
  email = "panic@thedis.co",
}: {
  program: {
    name: string;
  };
  payout: {
    amount: number; // in cents
    failureReason?: string;
  };
  partner: {
    paypalEmail: string;
  };
  email: string;
}) {
  const amountFormatted = currencyFormatter(payout.amount);

  return (
    <Html>
      <Head />
      <Preview>
        Action Required - Your recent payout from {program.name} failed
      </Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-8 max-w-[600px] px-8 py-8">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>

            <Heading className="mx-0 my-8 p-0 text-lg font-medium text-black">
              Your recent payout from {program.name} failed
            </Heading>

            <Text>
              We attempted to send your recent payout of{" "}
              <span className="font-semibold text-purple-600">
                {amountFormatted}
              </span>{" "}
              via PayPal to{" "}
              <span className="font-semibold text-purple-600">
                {partner.paypalEmail}
              </span>
              , but the transaction failed.
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
              To resolve this, please verify that your PayPal account is active
              and able to receive payments. Please update your account details
              at your earliest convenience and retry the payout from your{" "}
              <Link
                href="https://partners.dub.co/payouts"
                className="font-medium text-black underline"
              >
                Payout settings
              </Link>
              .
            </Text>

            <Section className="my-8">
              <Link
                className="rounded-lg bg-neutral-900 px-6 py-3 text-[13px] font-medium text-white no-underline"
                href="https://partners.dub.co/payouts"
              >
                Payout settings
              </Link>
            </Section>

            <Text className="text-sm leading-6 text-neutral-600">
              If you have any questions, just reply to this email.
            </Text>

            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
