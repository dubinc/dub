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
import Footer from "./components/footer";

export default function PartnerPayoutSent({
  email = "panic@thedis.co",
  program = {
    id: "prog_d8pl69xXCv4AoHNT281pHQdo",
    name: "Acme",
    logo: DUB_WORDMARK,
  },
  payout = {
    amount: 490,
    startDate: "2024-01-01",
    endDate: "2024-01-31",
  },
}: {
  email: string;
  program: {
    id: string;
    name: string;
    logo: string | null;
  };
  payout: {
    amount: number;
    startDate: string;
    endDate: string;
  };
}) {
  const linkToPayout = `https://partners.dub.co/${program.id}/payouts`;

  const saleAmountInDollars = currencyFormatter(payout.amount / 100, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <Html>
      <Head />
      <Preview>You've been paid!</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[500px] rounded border border-solid border-gray-200 px-10 py-5">
            <Section className="mt-8">
              <Img
                src={program.logo || DUB_WORDMARK}
                height="40"
                alt={program.name}
                className="mx-auto my-0"
              />
            </Section>
            <Heading className="mx-0 my-7 p-0 text-center text-xl font-semibold text-black">
              You've been paid!
            </Heading>
            <Text className="text-sm leading-6 text-black">
              <strong>{program.name}</strong> has sent you{" "}
              <strong>{saleAmountInDollars}</strong> for affiliate sales made
              from <strong>{payout.startDate}</strong> to{" "}
              <strong>{payout.endDate}</strong>. Your wallet has been updated to
              reflect this payout.
            </Text>
            <Text className="text-sm leading-6 text-black"></Text>
            <Section className="my-8 text-center">
              <Link
                className="rounded-full bg-black px-6 py-3 text-center text-[12px] font-semibold text-white no-underline"
                href={linkToPayout}
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
