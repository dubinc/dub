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
            <Section className="mt-8">
              <Img
                src={program.logo || DUB_WORDMARK}
                height="40"
                alt={program.name}
                className="mx-auto my-0"
              />
            </Section>
            <Heading className="mx-0 my-7 p-0 text-center text-xl font-semibold text-black">
              You just made a {earningsInDollars} referral sale!
            </Heading>
            <Text className="text-sm leading-6 text-black">
              Congratulations! Someone made a{" "}
              <strong>{saleAmountInDollars}</strong> purchase on{" "}
              <strong>{program.name}</strong> using your referral link (
              <a
                href={partner.referralLink}
                className="text-semibold font-medium text-black underline"
              >
                {getPrettyUrl(partner.referralLink)}
              </a>
              ).
            </Text>
            <Text className="text-sm leading-6 text-black">
              Your received <strong>{earningsInDollars}</strong> in commission
              for this sale and it will be included in your next payout.
            </Text>
            <Text className="text-sm leading-6 text-black"></Text>
            <Section className="my-8 text-center">
              <Link
                className="rounded-full bg-black px-6 py-3 text-center text-[12px] font-semibold text-white no-underline"
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
