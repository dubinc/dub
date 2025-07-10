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

// Send this email after initiating a Stripe payout to the partner
export default function PartnerPayoutWithdrawalInitiated({
  email = "panic@thedis.co",
  payoutAmount = 490,
}: {
  email: string;
  payoutAmount: number;
}) {
  const payoutAmountFormatted = currencyFormatter(payoutAmount / 100, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <Html>
      <Head />
      <Preview>Your funds are on their way to your bank</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>

            <Heading className="mx-0 my-7 p-0 text-lg font-medium text-black">
              Your funds are on their way to your bank
            </Heading>

            <Text className="text-sm leading-6 text-neutral-600">
              Good news!{" "}
              <span className="font-semibold text-neutral-800">
                {payoutAmountFormatted}
              </span>{" "}
              is being transferred to your bank account.
            </Text>

            <Text className="text-sm leading-6 text-neutral-600">
              Depending on your bank's location, this process can{" "}
              <span className="font-semibold text-neutral-800">
                can take anywhere between 1-14 business days
              </span>
              . If there are any delays, please contact{" "}
              <Link
                href="https://support.stripe.com/express"
                className="font-medium text-black underline"
              >
                Stripe support
              </Link>
              .
            </Text>

            <Section className="mb-12 mt-8">
              <Link
                className="rounded-lg bg-neutral-900 px-4 py-3 text-[12px] font-semibold text-white no-underline"
                href="https://partners.dub.co/payouts"
              >
                View payouts
              </Link>
            </Section>
            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
