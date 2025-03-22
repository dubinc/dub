import { capitalize, currencyFormatter, DUB_WORDMARK } from "@dub/utils";
import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import { Footer } from "../components/footer";

export function NewSaleAlertProgramOwner({
  user = {
    name: "Brendan Urie",
    email: "panic@thedis.co",
  },
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
    email: "steven@dub.co",
  },
  sale = {
    amount: 1330,
    earnings: 399,
  },
}: {
  user: {
    name?: string | null;
    email: string;
  };
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
    name: string | null;
    email: string | null;
  };
  sale: {
    amount: number;
    earnings: number;
  };
}) {
  const salesLink = `https://app.dub.co/${workspace.slug}/programs/${program.id}/sales?partnerId=${partner.id}`;
  const notificationPreferencesLink = `https://app.dub.co/${workspace.slug}/settings/notifications`;

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

  const finalName = user.name
    ? user.name.split(" ")[0]
    : capitalize(user.email.split("@")[0]);

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
              Hi {finalName},
            </Heading>

            <Text className="text-sm leading-6 text-neutral-600">
              You received a payment from a customer referred by{" "}
              <strong>
                {partner.name
                  ? `${partner.name} (${partner.email})`
                  : partner.email}
              </strong>
              .
            </Text>

            <Section className="my-8 w-full">
              <div className="rounded-lg border border-neutral-200">
                <Row>
                  <Column>
                    <Text className="m-0 text-sm leading-6 text-neutral-600">
                      Sale amount
                    </Text>
                  </Column>
                  <Column align="right">
                    <Text className="m-0 text-sm font-medium leading-6 text-neutral-600">
                      {saleAmountInDollars} USD
                    </Text>
                  </Column>
                </Row>

                <Row>
                  <Column>
                    <Text className="m-0 text-sm leading-6 text-neutral-600">
                      Partner commission
                    </Text>
                  </Column>
                  <Column align="right">
                    <Text className="m-0 text-sm font-medium leading-6 text-neutral-600">
                      -{earningsInDollars} USD
                    </Text>
                  </Column>
                </Row>

                <div className="my-4 h-px w-full bg-neutral-200" />

                <Row>
                  <Column>
                    <Text className="m-0 text-sm font-medium leading-6 text-black">
                      Your profit
                    </Text>
                  </Column>
                  <Column align="right">
                    <Text className="m-0 text-sm font-medium leading-6 text-black">
                      {profitInDollars} USD
                    </Text>
                  </Column>
                </Row>
              </div>
            </Section>

            {formattedDueDate && (
              <Text className="text-sm leading-6 text-neutral-600">
                Payment for this commission will be due on{" "}
                <strong>{formattedDueDate}</strong>, based on your campaign
                settings.
              </Text>
            )}

            <Text className="text-sm leading-6 text-neutral-600">
              You can view sales and commissions in the{" "}
              <Link href={salesLink} className="text-blue-600 underline">
                program dashboard
              </Link>
              .
            </Text>

            <Text className="text-sm leading-6 text-neutral-600">
              <Link
                href={notificationPreferencesLink}
                className="text-neutral-500 underline"
              >
                Change your notification preferences
              </Link>
            </Text>

            <Footer email={user.email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export default NewSaleAlertProgramOwner;
