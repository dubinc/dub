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
import { addBusinessDays } from "date-fns";
import { Footer } from "../components/footer";

// Send this email when the payout is confirmed when payment is send using ACH
export default function PartnerPayoutConfirmed({
  email = "panic@thedis.co",
  program = {
    id: "prog_CYCu7IMAapjkRpTnr8F1azjN",
    name: "Acme",
    logo: DUB_WORDMARK,
  },
  payout = {
    id: "po_8VuCr2i7WnG65d4TNgZO19fT",
    amount: 490,
    initiatedAt: new Date("2024-11-22"),
    startDate: new Date("2024-11-01"),
    endDate: new Date("2024-11-30"),
    mode: "internal",
    paymentMethod: "ach",
    payoutMethod: "stripe",
  },
}: {
  email: string;
  program: {
    id: string;
    name: string;
    logo: string | null;
  };
  payout: {
    id: string;
    amount: number;
    initiatedAt: Date | null;
    startDate?: Date | null;
    endDate?: Date | null;
    mode: "internal" | "external" | null;
    paymentMethod: string;
    payoutMethod: "stripe" | "paypal";
  };
}) {
  const payoutAmountInDollars = currencyFormatter(payout.amount);

  const startDate = payout.startDate
    ? formatDate(payout.startDate, {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      })
    : null;

  const endDate = payout.endDate
    ? formatDate(payout.endDate, {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      })
    : null;

  const etaDays = payout.paymentMethod === "ach_fast" ? 2 : 5;

  return (
    <Html>
      <Head />
      <Preview>
        {program.name} has initiated a payout of {payoutAmountInDollars}
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
              Your payout is on the way!
            </Heading>

            <Text className="text-sm leading-6 text-neutral-600">
              <strong className="text-black">{program.name}</strong> has
              initiated a payout of{" "}
              <strong className="text-black">{payoutAmountInDollars}</strong>
              {startDate && endDate ? (
                <>
                  {" "}
                  for affiliate commissions made from{" "}
                  <strong className="text-black">{startDate}</strong> to{" "}
                  <strong className="text-black">{endDate}</strong>
                </>
              ) : (
                ""
              )}
              .
            </Text>

            <Text className="text-sm leading-6 text-neutral-600">
              The payout is currently being processed and is expected to be
              transferred to your{" "}
              <strong className="text-black">
                {payout.mode === "external"
                  ? program.name
                  : payout.payoutMethod === "paypal"
                    ? "PayPal"
                    : "Stripe Express"}
              </strong>{" "}
              account in{" "}
              <strong className="text-black">{etaDays} business days</strong>{" "}
              (excluding weekends and public holidays).
            </Text>

            {payout.initiatedAt && (
              <Text className="text-sm leading-6 text-neutral-600">
                <span className="text-sm text-neutral-500">
                  Estimated arrival date:{" "}
                  <strong className="text-black">
                    {formatDate(addBusinessDays(payout.initiatedAt, etaDays))}
                  </strong>
                  .
                </span>
              </Text>
            )}

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
