import { currencyFormatter } from "@dub/utils";
import {
  Body,
  Container,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import { Footer } from "../../components/footer";
import {
  BELOW_MIN_WITHDRAWAL_FEE_CENTS,
  MIN_WITHDRAWAL_AMOUNT_CENTS,
} from "../../types";

export default function PayoutAutoWithdrawals({
  email = "panic@thedis.co",
}: {
  email: string;
}) {
  return (
    <Html>
      <Preview>You've got money coming your way!</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mt-8">
              <Img
                src="https://assets.dub.co/wordmark.png"
                height="32"
                alt="Dub wordmark"
              />
            </Section>

            <Heading className="mx-0 my-7 p-0 text-lg font-medium text-black">
              Your payouts will be sent to your bank account soon
            </Heading>

            <Text className="text-sm leading-6 text-neutral-600">
              You're receiving this email because you currently have{" "}
              <code className="rounded bg-indigo-100 px-1.5 py-0.5 text-indigo-600">
                processed
              </code>{" "}
              payouts in your Dub partner account.
            </Text>

            <Text className="text-sm leading-6 text-neutral-600">
              For compliance reasons, all{" "}
              <code className="rounded bg-indigo-100 px-1.5 py-0.5 text-indigo-600">
                processed
              </code>{" "}
              payouts will be automatically withdrawn to your connected bank
              account after 90 days.
            </Text>

            <Section className="mb-8 mt-6">
              <Link
                className="rounded-lg bg-neutral-900 px-4 py-3 text-[12px] font-semibold text-white no-underline"
                href="https://partners.dub.co/payouts?status=processed"
              >
                View your payouts
              </Link>
            </Section>

            <Text className="text-sm leading-6 text-neutral-600">
              If you'd like to receive your payout right away, please{" "}
              <Link
                href="https://partners.dub.co/payouts?status=processed"
                target="_blank"
                className="font-medium text-black underline decoration-dotted underline-offset-2"
              >
                go to your Payouts page
              </Link>{" "}
              and select <strong className="text-black">"Pay out now"</strong>{" "}
              to withdraw your payout.
            </Text>

            <Text className="text-sm leading-6 text-neutral-600">
              Note: If your{" "}
              <code className="rounded bg-indigo-100 px-1.5 py-0.5 text-indigo-600">
                processed
              </code>{" "}
              payouts total is below the{" "}
              <a
                href="https://dub.co/help/article/receiving-payouts#what-is-the-minimum-withdrawal-amount-and-how-does-it-work"
                target="_blank"
                className="font-medium text-black underline decoration-dotted underline-offset-2"
              >
                minimum withdrawal amount
              </a>{" "}
              of{" "}
              {currencyFormatter(MIN_WITHDRAWAL_AMOUNT_CENTS, {
                trailingZeroDisplay: "stripIfInteger",
              })}
              , a withdrawal fee of{" "}
              {currencyFormatter(BELOW_MIN_WITHDRAWAL_FEE_CENTS, {
                trailingZeroDisplay: "stripIfInteger",
              })}{" "}
              will be applied.
            </Text>
            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
