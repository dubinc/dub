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
  const saleAmountInDollars = currencyFormatter(payout.amount / 100);

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
      <Preview>You've been paid!</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>

            <Heading className="mx-0 my-7 p-0 text-lg font-medium text-black">
              You've been paid!
            </Heading>

            <Text className="text-sm leading-6 text-neutral-600">
              Good news! <strong className="text-black">{program.name}</strong>{" "}
              has sent you{" "}
              <strong className="text-black">{saleAmountInDollars}</strong>
              {startDate && endDate ? (
                <>
                  {" "}
                  for affiliate sales made from{" "}
                  <strong className="text-black">{startDate}</strong> to{" "}
                  <strong className="text-black">{endDate}</strong>.
                </>
              ) : (
                "."
              )}
            </Text>

            <Text className="text-sm leading-6 text-neutral-600">
              {variant === "stripe"
                ? "If the balance in your Stripe Express account is above your minimum withdrawal amount, they'll automatically begin transferring to your bank account. You can change your minimum withdrawal amount any time in your payout settings."
                : "Your payout is on its way to your PayPal account. You'll receive an email from PayPal when it's complete."}
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
