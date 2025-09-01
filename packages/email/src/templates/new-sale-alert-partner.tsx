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
import { Footer } from "../components/footer";

export default function NewSaleAlertPartner({
  email = "panic@thedis.co",
  partner = {
    referralLink: "https://refer.dub.co/steven",
  },
  program = {
    name: "Acme",
    slug: "acme",
    logo: DUB_WORDMARK,
    holdingPeriodDays: 30,
  },
  sale = {
    amount: 4900,
    earnings: 490,
  },
}: {
  email: string;
  partner: {
    referralLink: string;
  };
  program: {
    name: string;
    slug: string;
    logo: string | null;
    holdingPeriodDays: number;
  };
  sale: {
    amount: number;
    earnings: number;
  };
}) {
  const linkToEarnings = `https://partners.dub.co/programs/${program.slug}/earnings`;

  const earningsInDollars = currencyFormatter(sale.earnings / 100);

  const saleAmountInDollars = currencyFormatter(sale.amount / 100);

  return (
    <Html>
      <Head />
      <Preview>
        You just made a {earningsInDollars} sale via your referral link{" "}
        {getPrettyUrl(partner.referralLink)}
      </Preview>
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

            <Heading className="mx-0 my-7 p-0 text-lg font-medium text-black">
              You just made a {earningsInDollars} referral commission!
            </Heading>

            <Text className="text-sm leading-6 text-neutral-600">
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

            <Text className="text-sm leading-6 text-neutral-600">
              You received{" "}
              <strong className="text-black">{earningsInDollars}</strong> in
              commission for this sale
              {program.holdingPeriodDays > 0 ? (
                <>
                  {" "}
                  and it will be eligible for payout after the program's{" "}
                  {program.holdingPeriodDays}-day holding period (
                  <strong>
                    {new Date(
                      Date.now() +
                        program.holdingPeriodDays * 24 * 60 * 60 * 1000,
                    ).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </strong>
                  )
                </>
              ) : (
                " and it will be included in your next payout"
              )}
              .
            </Text>

            <Section className="mb-12 mt-8">
              <Link
                className="rounded-lg bg-neutral-900 px-4 py-3 text-[12px] font-semibold text-white no-underline"
                href={linkToEarnings}
              >
                View earnings
              </Link>
            </Section>
            <Footer
              email={email}
              notificationSettingsUrl="https://partners.dub.co/settings/notifications"
            />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
