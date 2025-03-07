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

export function NewSaleAlertProgramOwner({
  email = "panic@thedis.co",
  workspace = {
    name: "Acme",
    slug: "acme",
  },
  program = {
    id: "prog_CYCu7IMAapjkRpTnr8F1azjN",
    name: "Acme",
    logo: DUB_WORDMARK,
    holdingPeriodDays: 30,
  },
  partner = {
    id: "pn_OfewI1Faaf5pV8QH3mha8L7S",
    name: "Steven",
    referralLink: "https://refer.dub.co/steven",
  },
  sale = {
    amount: 1330,
    earnings: 399,
    commissionRate: 30,
  },
}: {
  email: string;
  workspace: {
    name: string;
    slug: string;
  };
  program: {
    id: string;
    name: string;
    logo: string | null;
    holdingPeriodDays: number;
  };
  partner: {
    id: string;
    name: string;
    referralLink: string;
  };
  sale: {
    amount: number;
    earnings: number;
    commissionRate: number;
  };
}) {
  const linkToProgram = `https://app.dub.co/${workspace.slug}/programs/${program.id}/sales?partnerId=${partner.id}`;

  const saleAmountInDollars = currencyFormatter(sale.amount / 100, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const earningsInDollars = currencyFormatter(sale.earnings / 100, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const profitInDollars = currencyFormatter(
    (sale.amount - sale.earnings) / 100,
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  );

  let formattedDueDate = "";

  if (program.holdingPeriodDays > 0) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + program.holdingPeriodDays);

    formattedDueDate = dueDate.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <Html>
      <Head />
      <Preview>You received a payment from a customer referred! 💰</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[500px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="my-8">
              <Img
                src={program.logo || "https://assets.dub.co/logo.png"}
                height="32"
                alt={program.name}
              />
            </Section>

            <Heading className="mx-0 my-6 p-0 text-lg font-medium text-black">
              Hi {email.split("@")[0]},
            </Heading>

            <Text className="text-sm leading-6 text-neutral-600">
              You received a payment from a customer referred by{" "}
              <strong>{partner.name || partner.referralLink}</strong>.
            </Text>

            <Section className="my-4">
              <div>
                <Text className="my-2 flex justify-between text-sm leading-6 text-neutral-600">
                  <strong>Amount</strong>
                  <span>{saleAmountInDollars} USD</span>
                </Text>

                <Text className="my-2 flex justify-between text-sm leading-6 text-neutral-600">
                  <strong>Commission</strong>
                  <span>-{earningsInDollars} USD</span>
                </Text>

                <div className="h-px w-full bg-neutral-200" />

                <Text className="my-2 flex justify-between text-sm leading-6 text-neutral-600">
                  <strong>Profit</strong>
                  <strong>{profitInDollars} USD</strong>
                </Text>
              </div>
            </Section>

            {formattedDueDate && (
              <Text className="text-sm leading-6 text-neutral-600">
                Payment for this commission is not due until{" "}
                <strong>{formattedDueDate}</strong>, based on your campaign
                settings.
              </Text>
            )}

            <Text className="text-sm leading-6 text-neutral-600">
              You can view sales and commissions in the{" "}
              <Link href={linkToProgram} className="text-blue-600 underline">
                program dashboard
              </Link>
              .
            </Text>

            <Text className="text-sm leading-6 text-neutral-600">Thanks!</Text>

            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export default NewSaleAlertProgramOwner;
