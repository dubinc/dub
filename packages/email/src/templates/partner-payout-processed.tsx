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
import {
  BELOW_MIN_WITHDRAWAL_FEE_CENTS,
  MIN_WITHDRAWAL_AMOUNT_CENTS,
  PartnerPayoutMethod,
  STABLECOIN_PAYOUT_FEE_RATE,
} from "../types";

export default function PartnerPayoutProcessed({
  email = "panic@thedis.co",
  program = {
    name: "Acme",
    logo: DUB_WORDMARK,
  },
  payout = {
    id: "po_8VuCr2i7WnG65d4TNgZO19fT",
    amount: 200,
    periodStart: new Date("2026-02-01"),
    periodEnd: new Date("2026-02-01"),
    method: "stablecoin",
  },
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
    method: PartnerPayoutMethod | null;
  };
}) {
  const isBelowMinimumWithdrawalAmount =
    payout.amount < MIN_WITHDRAWAL_AMOUNT_CENTS;
  const payoutAmountInDollars = currencyFormatter(payout.amount);

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

  let statusMessage: string | React.ReactNode = "";

  if (payout.method === "paypal") {
    statusMessage =
      "Your payout is on its way to your PayPal account. You'll receive an email from PayPal when it's complete.";
  } else if (isBelowMinimumWithdrawalAmount) {
    statusMessage = (
      <>
        Since this payout is below the{" "}
        <a
          href="https://dub.co/help/article/receiving-payouts#what-is-the-minimum-withdrawal-amount-and-how-does-it-work"
          target="_blank"
          className="font-medium text-black underline decoration-dotted underline-offset-2"
        >
          minimum withdrawal amount
        </a>{" "}
        of {currencyFormatter(MIN_WITHDRAWAL_AMOUNT_CENTS)}, it will remain in{" "}
        <code className="rounded bg-indigo-100 px-1.5 py-0.5 text-indigo-600">
          processed
        </code>{" "}
        status.
        <br />
        <br />
        If you'd like to receive your payout right away, please{" "}
        <Link
          href="https://partners.dub.co/payouts"
          target="_blank"
          className="font-medium text-black underline decoration-dotted underline-offset-2"
        >
          go to your Payouts page
        </Link>{" "}
        and select <strong className="text-black">"Pay out now"</strong> to
        withdraw your payout for a{" "}
        {currencyFormatter(BELOW_MIN_WITHDRAWAL_FEE_CENTS)} fee.
        <br />
        <br />
        Note:{" "}
        <code className="rounded bg-indigo-100 px-1.5 py-0.5 text-indigo-600">
          processed
        </code>{" "}
        payouts will remain in your account for up to 90 days, after which it
        will be automatically withdrawn (for a{" "}
        {currencyFormatter(BELOW_MIN_WITHDRAWAL_FEE_CENTS)} withdrawal fee).
      </>
    );
  } else if (payout.method === "stablecoin") {
    statusMessage = (
      <>
        After a {STABLECOIN_PAYOUT_FEE_RATE * 100}% stablecoin fee,{" "}
        <strong className="text-black">
          {currencyFormatter(
            payout.amount * (1 - STABLECOIN_PAYOUT_FEE_RATE) -
              (isBelowMinimumWithdrawalAmount
                ? BELOW_MIN_WITHDRAWAL_FEE_CENTS
                : 0),
          )}
        </strong>{" "}
        will be transferred to your connected crypto wallet. You should receive
        it within minutes.
      </>
    );
  } else {
    statusMessage = (
      <>
        Your funds will begin transferring to your connected bank account
        shortly. You will receive another email when the funds are on their way.
      </>
    );
  }

  return (
    <Html>
      <Head />
      <Preview>
        {program.name} has sent you a {payoutAmountInDollars} payout
        {startDate && endDate
          ? ` for affiliate commissions made ${
              startDate === endDate
                ? `on ${startDate}`
                : `from ${startDate} to ${endDate}`
            }`
          : ""}
        .
      </Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mt-8">
              <Img
                src={program.logo || "https://assets.dub.co/wordmark.png"}
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
              <strong className="text-black">{payoutAmountInDollars}</strong>{" "}
              for affiliate commissions made via{" "}
              <Link
                href="https://partners.dub.co"
                target="_blank"
                className="font-medium text-black underline decoration-dotted underline-offset-2"
              >
                Dub Partners
              </Link>
              {startDate && endDate ? (
                <>
                  {" "}
                  {startDate === endDate ? (
                    <>
                      on <strong className="text-black">{startDate}</strong>.
                    </>
                  ) : (
                    <>
                      from <strong className="text-black">{startDate}</strong>{" "}
                      to <strong className="text-black">{endDate}</strong>.
                    </>
                  )}
                </>
              ) : (
                "."
              )}
            </Text>

            <Section className="my-8">
              <Link
                className="rounded-lg bg-neutral-900 px-4 py-3 text-[12px] font-semibold text-white no-underline"
                href={`https://partners.dub.co/payouts?payoutId=${payout.id}`}
              >
                View payout
              </Link>
            </Section>

            <Text className="text-sm leading-6 text-neutral-600">
              {statusMessage}
            </Text>
            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
