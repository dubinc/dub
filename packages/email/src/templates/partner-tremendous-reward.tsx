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

export default function PartnerTremendousReward({
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

  return (
    <Html>
      <Head />
      <Preview>
        {program.name} has sent you a {payoutAmountInDollars} reward
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
              Your reward is ready!
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

            <Text className="text-sm leading-6 text-neutral-600">
              Click the button below to redeem your reward and choose from
              available gift card options.
            </Text>

            <Section className="my-8">
              <Link
                className="rounded-lg bg-neutral-900 px-4 py-3 text-[12px] font-semibold text-white no-underline"
                href={redeemUrl}
              >
                Redeem reward
              </Link>
            </Section>

            <Text className="text-sm leading-6 text-neutral-600">
              You can also{" "}
              <Link
                href={`https://partners.dub.co/payouts?payoutId=${payout.id}`}
                target="_blank"
                className="font-medium text-black underline decoration-dotted underline-offset-2"
              >
                view this payout
              </Link>{" "}
              in your Dub Partners account.
            </Text>

            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
