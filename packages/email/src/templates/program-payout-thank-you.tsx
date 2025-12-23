import { currencyFormatter, nFormatter, pluralize } from "@dub/utils";
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

export default function ProgramPayoutThankYou({
  email = "panic@thedis.co",
  workspace = {
    slug: "acme",
  },
  program = {
    name: "Acme",
  },
  payout = {
    amount: 450000000,
    partnersCount: 1234,
  },
}: {
  email: string;
  workspace: {
    slug: string;
  };
  program: {
    name: string;
  };
  payout: {
    amount: number; // in cents
    partnersCount: number;
  };
}) {
  const formattedAmount = currencyFormatter(payout.amount, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return (
    <Html>
      <Head>
        <style>{`
          @media only screen and (max-width: 600px) {
            .amount-text {
              font-size: 3.25rem !important;
            }
            .heading-text {
              font-size: 1rem !important;
            }
          }
        `}</style>
      </Head>
      <Preview>
        Thank you {program.name} for your payout to{" "}
        {nFormatter(payout.partnersCount, { full: true })}{" "}
        {pluralize("partner", payout.partnersCount)}!
      </Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-neutral-100 font-sans">
          <Container className="mx-auto my-0 max-w-[600px] py-0">
            <Section className="mb-8 mt-0 text-center">
              <Img
                src="https://assets.dub.co/misc/payout-thank-you-header.jpg"
                width="600"
                alt="Thank you"
                style={{
                  maxWidth: "100%",
                  height: "auto",
                  display: "block",
                  margin: "0 auto",
                }}
              />
            </Section>

            <Heading className="heading-text mx-0 mb-6 p-0 text-center text-lg font-medium text-neutral-800">
              Thank you <strong>{program.name}</strong>
              <br />
              for your payout to{" "}
              {nFormatter(payout.partnersCount, { full: true })}{" "}
              {pluralize("partner", payout.partnersCount)}!
            </Heading>

            <Section className="mb-8 text-center">
              <Text
                className="amount-text m-0 font-extrabold text-neutral-800"
                style={{
                  fontSize: "clamp(2rem, 8vw, 6rem)",
                  lineHeight: "1.1",
                }}
              >
                {formattedAmount}
              </Text>
            </Section>

            <Section className="mb-8 mt-6 text-center">
              <Link
                href={`https://app.dub.co/${workspace.slug}/settings/billing/invoices?type=partnerPayout`}
                className="box-border inline-block rounded-lg bg-black px-6 py-4 text-center text-sm leading-none text-white no-underline"
              >
                View your invoices
              </Link>
            </Section>

            <Section className="mx-auto max-w-[400px] text-center">
              <Footer email={email} />
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
