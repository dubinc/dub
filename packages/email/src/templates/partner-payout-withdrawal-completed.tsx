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

// Send this email after payout.paid webhook is received
export default function PartnerPayoutWithdrawalCompleted({
  email = "panic@thedis.co",
  amount = 45590,
  arrivalDate = 1722163200,
  traceId = "DUB PARTN-XYZ",
}: {
  email: string;
  amount: number;
  arrivalDate: number;
  traceId: string | null;
}) {
  const amountInDollars = currencyFormatter(amount / 100, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const fiveBusinessDaysFromArrivalDate = (() => {
    let date = new Date(arrivalDate * 1000);
    let businessDays = 0;
    while (businessDays < 5) {
      date.setDate(date.getDate() + 1);
      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (date.getDay() !== 0 && date.getDay() !== 6) {
        businessDays++;
      }
    }
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  })();

  return (
    <Html>
      <Head />
      <Preview>Your funds have been transferred to your bank account</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>

            <Heading className="mx-0 my-7 p-0 text-lg font-medium text-black">
              Your funds have been transferred to your bank account
            </Heading>

            <Text className="text-sm leading-6 text-neutral-600">
              <span className="font-semibold text-neutral-800">
                {amountInDollars}
              </span>{" "}
              has been transferred from your Stripe Express account to your
              connected bank account.
            </Text>

            <Text className="text-sm leading-6 text-neutral-600">
              Banks can take up to 5 business days to process payouts. Wait
              until{" "}
              <span className="font-semibold text-neutral-800">
                {fiveBusinessDaysFromArrivalDate}
              </span>{" "}
              and then contact your bank
              {traceId
                ? ` using the following trace ID (reference number):`
                : "."}
            </Text>

            {traceId && (
              <Text className="text-sm font-semibold text-purple-600">
                {traceId}
              </Text>
            )}

            <Text className="text-sm leading-6 text-neutral-600">
              If you still have any questions, contact{" "}
              <Link
                href="https://support.stripe.com/express"
                className="font-medium text-black underline"
              >
                Stripe support
              </Link>
              .
            </Text>
            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
