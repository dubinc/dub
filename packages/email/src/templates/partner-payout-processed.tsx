import { currencyFormatter, DUB_WORDMARK, formatDate } from "@dub/utils";
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

export default function PartnerPayoutProcessed({
  email = "panic@thedis.co",
  program = {
    name: "Acme",
    logo: DUB_WORDMARK,
  },
  payout = {
    id: "po_8VuCr2i7WnG65d4TNgZO19fT",
    amount: 490,
    periodStart: new Date("2024-11-01"),
    periodEnd: new Date("2024-11-30"),
  },
  variant = "stripe",
}: {
  email: string;
  program: {
    name: string;
    logo: string | null;
  };
  payout: {
    id: string;
    amount: number;
    periodStart?: Date | null;
    periodEnd?: Date | null;
  };
  variant: "stripe" | "paypal";
}) {
  const payoutAmountInDollars = currencyFormatter(payout.amount, {
    trailingZeroDisplay: "stripIfInteger",
  });

  const startDate = payout.periodStart
    ? formatDate(payout.periodStart, {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      })
    : null;

  const endDate = payout.periodEnd
    ? formatDate(payout.periodEnd, {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      })
    : null;

  return (
    <Html>
      <Head />
      <Preview>
        {program.name} has sent you a {payoutAmountInDollars} payout
        {startDate && endDate
          ? ` for affiliate commissions made from ${startDate} to ${endDate}`
          : ""}
        .
      </Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mt-8">
              <Img
                src={program.logo || "https://assets.dub.co/logo.png"}
                height="32"
                alt={program.name}
              />
            </Section>

            <Heading className="mx-0 my-7 p-0 text-lg font-medium text-black">
              You've been paid!
            </Heading>

            <Text className="text-sm leading-6 text-neutral-600">
              Good news! <strong className="text-black">{program.name}</strong>{" "}
              has sent you{" "}
              <strong className="text-black">{payoutAmountInDollars}</strong>
              {startDate && endDate ? (
                <>
                  {" "}
                  for affiliate commissions made from{" "}
                  <strong className="text-black">{startDate}</strong> to{" "}
                  <strong className="text-black">{endDate}</strong>.
                </>
              ) : (
                "."
              )}
            </Text>

            <Text className="text-sm leading-6 text-neutral-600">
              {variant === "stripe"
                ? payout.amount >= 1000
                  ? "The funds will begin transferring to your connected bank account shortly. You will receive another email when the funds are on their way."
                  : "Since this payout is below the minimum withdrawal amount of $10, it will remain in processed status. If you'd like to receive your payout now, you can do so with a $0.50 withdrawal fee."
                : "Your payout is on its way to your PayPal account. You'll receive an email from PayPal when it's complete."}
            </Text>

            <Section className="mb-12 mt-8">
              <Link
                className="rounded-lg bg-neutral-900 px-4 py-3 text-[12px] font-semibold text-white no-underline"
                href={`https://partners.dub.co/payouts?payoutId=${payout.id}`}
              >
                View payout
              </Link>
            </Section>
            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
