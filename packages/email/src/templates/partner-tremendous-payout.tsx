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

export default function PartnerTremendousPayout({
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
  },
  redeemUrl = "https://www.tremendous.com/rewards/example",
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
  redeemUrl: string;
}) {
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

  let preview = `${program.name} has sent you a ${payoutAmountInDollars} reward`;

  if (startDate && endDate) {
    preview += ` for affiliate commissions made ${
      startDate === endDate
        ? `on ${startDate}`
        : `from ${startDate} to ${endDate}`
    }`;
  }

  const payoutPeriodMessage =
    startDate && endDate ? (
      startDate === endDate ? (
        <>
          on <strong className="text-black">{startDate}</strong>.
        </>
      ) : (
        <>
          from <strong className="text-black">{startDate}</strong> to{" "}
          <strong className="text-black">{endDate}</strong>.
        </>
      )
    ) : (
      "."
    );

  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] px-10 py-5">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>

            <Heading className="mx-0 my-7 p-0 text-lg font-medium text-black">
              You've been paid!
            </Heading>

            <Text className="text-sm leading-6 text-neutral-600">
              Good news! <strong className="text-black">{program.name}</strong>{" "}
              has sent you{" "}
              <strong className="text-black">
                {currencyFormatter(payout.amount)}
              </strong>{" "}
              for affiliate commissions made via Dub Partners{" "}
              {payoutPeriodMessage}
            </Text>

            <Text className="text-sm leading-6 text-neutral-600">
              Click the button below to redeem your reward.
            </Text>

            <Section className="my-8">
              <Link
                className="rounded-lg bg-neutral-900 px-4 py-2.5 text-[12px] font-semibold text-white no-underline"
                href={redeemUrl}
              >
                Redeem reward
              </Link>
            </Section>

            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
