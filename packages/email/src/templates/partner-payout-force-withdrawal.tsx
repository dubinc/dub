import { currencyFormatter } from "@dub/utils";
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
import { PartnerPayoutMethod } from "../types";

export default function PartnerPayoutForceWithdrawal({
  email = "panic@thedis.co",
  payout = {
    amount: 200,
    method: "stablecoin",
  },
}: {
  email: string;
  payout: {
    amount: number;
    method: Extract<PartnerPayoutMethod, "stablecoin" | "connect">;
  };
}) {
  const payoutAmountInDollars = currencyFormatter(payout.amount);
  const STABLECOIN_PAYOUT_FEE_RATE = 0.005;
  const BELOW_MIN_WITHDRAWAL_FEE_CENTS = 50;

  let statusMessage: string | React.ReactNode = "";

  if (payout.method === "stablecoin") {
    statusMessage = (
      <>
        After a {STABLECOIN_PAYOUT_FEE_RATE * 100}% stablecoin fee + a{" "}
        {currencyFormatter(BELOW_MIN_WITHDRAWAL_FEE_CENTS)} withdrawal fee,{" "}
        <strong className="text-black">
          {currencyFormatter(
            payout.amount * (1 - STABLECOIN_PAYOUT_FEE_RATE) -
              BELOW_MIN_WITHDRAWAL_FEE_CENTS,
          )}
        </strong>{" "}
        will be transferred to your connected crypto wallet. You should receive
        it within minutes.
      </>
    );
  } else {
    statusMessage = (
      <>
        After a {currencyFormatter(BELOW_MIN_WITHDRAWAL_FEE_CENTS)} withdrawal
        fee,{" "}
        <strong className="text-black">
          {currencyFormatter(payout.amount - BELOW_MIN_WITHDRAWAL_FEE_CENTS)}
        </strong>{" "}
        will begin transferring to your connected bank account shortly. You will
        receive another email when the funds are on their way.
      </>
    );
  }

  return (
    <Html>
      <Head />
      <Preview>
        A withdrawal of {payoutAmountInDollars} has been initiated.
      </Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mt-8">
              <Img
                src="https://assets.dub.co/logo.png"
                height="32"
                alt="Dub logo"
              />
            </Section>

            <Heading className="mx-0 my-7 p-0 text-lg font-medium text-black">
              You've got money coming your way!
            </Heading>

            <Text className="text-sm leading-6 text-neutral-600">
              A withdrawal of {payoutAmountInDollars} has been initiated from
              your Dub account.
            </Text>

            <Text className="text-sm leading-6 text-neutral-600">
              {statusMessage}
            </Text>

            <Section className="my-8">
              <Link
                className="rounded-lg bg-neutral-900 px-4 py-3 text-[12px] font-semibold text-white no-underline"
                href="https://partners.dub.co/payouts"
              >
                View your payouts
              </Link>
            </Section>
            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
