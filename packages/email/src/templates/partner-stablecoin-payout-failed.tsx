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

// Send this email to the partner when a stablecoin payout fails or is returned
export default function PartnerStablecoinPayoutFailed({
  programs = [{ name: "Acme" }],
  payout = {
    amount: 530000,
    failureReason: "The destination wallet address is invalid.",
  },
  wallet = {
    maskedAddress: "0x1234••••5678",
    network: "ethereum",
  },
  email = "panic@thedis.co",
}: {
  programs: {
    name: string;
  }[];
  payout: {
    amount: number; // in cents
    failureReason?: string;
  };
  wallet?: {
    maskedAddress?: string;
    network?: string;
  };
  email: string;
}) {
  const amountFormatted = currencyFormatter(payout.amount);
  const programNamesFormatted = programs.map((p) => p.name).join(", ");

  return (
    <Html>
      <Head />
      <Preview>Action Required - Your recent stablecoin payout failed</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-8 max-w-[600px] px-8 py-8">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>

            <Heading className="mx-0 my-8 p-0 text-lg font-medium text-black">
              Your recent payout
              {programs.length === 1
                ? ` from ${programNamesFormatted}`
                : ""}{" "}
              failed
            </Heading>

            <Text>
              We attempted to send your recent payout of{" "}
              <span className="font-semibold text-purple-600">
                {amountFormatted}
              </span>
              {programs.length > 1 ? (
                <>
                  {" "}
                  from{" "}
                  <span className="font-semibold text-purple-600">
                    {programNamesFormatted}
                  </span>
                </>
              ) : null}{" "}
              to your stablecoin wallet
              {wallet?.maskedAddress ? (
                <>
                  {" "}
                  (
                  <span className="font-semibold text-purple-600">
                    {wallet.maskedAddress}
                    {wallet.network ? ` · ${wallet.network}` : ""}
                  </span>
                  )
                </>
              ) : null}
              , but the transaction failed.
            </Text>

            {payout.failureReason && (
              <Text className="text-sm leading-6 text-neutral-600">
                Reason:{" "}
                <span className="font-semibold italic text-neutral-800">
                  {payout.failureReason}
                </span>
              </Text>
            )}

            <Text>
              Payout failures are usually due to incorrect wallet configuration.
              Please reconnect your stablecoin wallet at your earliest
              convenience and retry the payout from your{" "}
              <Link
                href="https://partners.dub.co/payouts?settings=true"
                className="font-medium text-black underline"
              >
                Payout settings
              </Link>
              .
            </Text>

            <Section className="my-8">
              <Link
                className="rounded-lg bg-neutral-900 px-6 py-3 text-[13px] font-medium text-white no-underline"
                href="https://partners.dub.co/payouts?settings=true"
              >
                Reconnect wallet
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
