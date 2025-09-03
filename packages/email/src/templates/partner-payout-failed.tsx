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

export default function PartnerPayoutFailed({
  workspace = {
    slug: "acme",
  },
  program = {
    name: "Acme",
  },
  payout = {
    amount: 530000,
    failureFee: 1000,
    cardLast4: "1234",
  },
  email = "panic@thedis.co",
}: {
  workspace: {
    slug: string;
  };
  program: {
    name: string;
  };
  payout: {
    amount: number; // in cents
    failureFee?: number; // in cents
    cardLast4?: string;
  };
  email: string;
}) {
  const payoutAmount = currencyFormatter(payout.amount / 100);

  return (
    <Html>
      <Head />
      <Preview>Partner payout failed</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-8 max-w-[600px] px-8 py-8">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>

            <Heading className="mx-0 my-8 p-0 text-lg font-medium text-black">
              Partner payout failed
            </Heading>

            <Text className="text-sm leading-6 text-neutral-600">
              Your recent partner payout of{" "}
              <span className="font-semibold text-purple-600">
                {payoutAmount}
              </span>{" "}
              for your program{" "}
              <span className="font-semibold text-purple-600">
                {program.name}
              </span>{" "}
              failed. It's been reverted back to{" "}
              <span className="font-semibold text-neutral-800">Pending</span>{" "}
              and will need to be confirmed again.
            </Text>

            {payout.failureFee && (
              <Text className="text-sm leading-6 text-neutral-600">
                To cover the cost of the failed payout, we've charged a{" "}
                <span className="font-semibold text-neutral-800">
                  ${payout.failureFee / 100} payment failure fee
                </span>
                {payout.cardLast4 && (
                  <>
                    {" "}
                    to your card ending in{" "}
                    <span className="font-semibold text-purple-600">
                      {payout.cardLast4}
                    </span>
                  </>
                )}
                .
              </Text>
            )}

            <Text className="text-sm leading-6 text-neutral-600">
              Please update your direct debit details at your earliest
              convenience to ensure that your partners are paid on time.
            </Text>

            <Section className="my-8">
              <Link
                className="rounded-lg bg-neutral-900 px-6 py-3 text-[13px] font-medium text-white no-underline"
                href={`https://app.dub.co/${workspace.slug}/settings/billing`}
              >
                Update direct debit details
              </Link>
            </Section>

            <Text className="text-sm leading-6 text-neutral-600">
              If you have any questions, just reply to this email.
            </Text>

            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
