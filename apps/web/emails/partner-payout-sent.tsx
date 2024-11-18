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
    startDate: "Nov 1, 2024",
    endDate: "Nov 30, 2024",
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
            <Section className="my-8">
              <Img
                src={program.logo || "https://assets.dub.co/logo.png"}
                height="32"
                alt={program.name}
              />
            </Section>

            <Heading className="mx-0 p-0 text-lg font-medium text-black">
              You've been paid!
            </Heading>

            <Text className="text-sm leading-6 text-gray-600">
              <strong>{program.name}</strong> has sent you{" "}
              <strong>{saleAmountInDollars}</strong> for affiliate sales made
              from <strong>{payout.startDate}</strong> to{" "}
              <strong>{payout.endDate}</strong>.
            </Text>
            <Text className="text-sm leading-6 text-gray-600">
              Your wallet has been updated to reflect this payout.
            </Text>

            <Section className="mb-12 mt-8">
              <Link
                className="rounded-md bg-neutral-900 px-4 py-3 text-[12px] font-medium text-white no-underline"
                href={linkToPayout}
              >
                View payouts
              </Link>
            </Section>
            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
