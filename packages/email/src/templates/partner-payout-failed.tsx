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
    amount: 224.12,
    failureFee: 10,
    cardLast4: "01234",
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
    amount: number;
    failureFee: number;
    cardLast4: string;
  };
  email: string;
}) {
  const payoutAmount = currencyFormatter(payout.amount, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

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

            <Text className="text-sm leading-6 text-neutral-600">
              We've charged a{" "}
              <span className="font-semibold text-neutral-800">
                ${payout.failureFee} payment failure fee
              </span>{" "}
              to your card ending in {payout.cardLast4}.
            </Text>

            <Text className="text-sm leading-6 text-neutral-600">
              Please update your payment info to avoid disruption.
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
