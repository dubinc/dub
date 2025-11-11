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
    startDate: new Date("2024-11-01"),
    endDate: new Date("2024-11-30"),
    paymentMethod: "ach_fast",
    mode: "internal",
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
    startDate?: Date | null;
    endDate?: Date | null;
    paymentMethod: string;
    mode: "internal" | "external" | null;
  };
}) {
  const saleAmountInDollars = currencyFormatter(payout.amount);

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

  return (
    <Html>
      <Head />
      <Preview>Your payout is being processed</Preview>
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

            <Heading className="mx-0 p-0 text-lg font-medium text-black">
              Your payout is being processed!
            </Heading>

            <Text className="text-sm leading-6 text-neutral-600">
              <strong className="text-black">{program.name}</strong> has
              initiated a payout of{" "}
              <strong className="text-black">{saleAmountInDollars}</strong>
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
              {payout.mode === "external" ? (
                <>
                  The payout is currently being processed and is expected to be
                  credited to your{" "}
                  <strong className="text-black">{program.name}</strong> account{" "}
                  <strong className="text-black">shortly</strong>.
                </>
              ) : (
                <>
                  The payout is currently being processed and is expected to be
                  credited to your account within
                  <strong>
                    {payout.paymentMethod === "ach_fast"
                      ? " 2 business days"
                      : " 5 business days"}
                  </strong>{" "}
                  (excluding weekends and public holidays).
                </>
              )}
            </Text>

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
