import { currencyFormatter, DUB_WORDMARK, getPrettyUrl } from "@dub/utils";
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

export default function NewSaleCreated({
  email = "panic@thedis.co",
  partner = {
    id: "pn_OfewI1Faaf5pV8QH3mha8L7S",
    referralLink: "https://refer.dub.co/steven",
  },
  program = {
    id: "prog_d8pl69xXCv4AoHNT281pHQdo",
    name: "Acme",
    logo: DUB_WORDMARK,
  },
  sale = {
    amount: 4900,
    earnings: 490,
  },
}: {
  email: string;
  partner: {
    id: string;
    referralLink: string;
  };
  program: {
    id: string;
    name: string;
    logo: string | null;
  };
  sale: {
    amount: number;
    earnings: number;
  };
}) {
  const linkToSale = `https://partners.dub.co/${partner.id}/${program.id}/sales`;

  const earningsInDollars = currencyFormatter(sale.earnings / 100, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const saleAmountInDollars = currencyFormatter(sale.amount / 100, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <Html>
      <Head />
      <Preview>
        You just made a {earningsInDollars} sale via your referral link{" "}
        {getPrettyUrl(partner.referralLink)}
      </Preview>
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
              You just made a {earningsInDollars} referral sale!
            </Heading>

            <Text className="text-sm leading-6 text-gray-600">
              Congratulations! Someone made a{" "}
              <strong className="text-black">{saleAmountInDollars}</strong>{" "}
              purchase on <strong className="text-black">{program.name}</strong>{" "}
              using your referral link (
              <a
                href={partner.referralLink}
                className="text-semibold font-medium text-black underline"
              >
                {getPrettyUrl(partner.referralLink)}
              </a>
              ).
            </Text>
            <Text className="text-sm leading-6 text-gray-600">
              Your received{" "}
              <strong className="text-black">{earningsInDollars}</strong> in
              commission for this sale and it will be included in your next
              payout.
            </Text>

            <Section className="mb-12 mt-8">
              <Link
                className="rounded-md bg-neutral-900 px-4 py-3 text-[12px] font-medium text-white no-underline"
                href={linkToSale}
              >
                View sale
              </Link>
            </Section>
            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
