import { currencyFormatter, DUB_WORDMARK, pluralize } from "@dub/utils";
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

export default function ProgramPayoutReminder({
  email = "panic@thedis.co",
  workspace = {
    slug: "acme",
  },
  program = {
    name: "Acme",
  },
  payout = {
    amount: 450000,
    partnersCount: 12,
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
  return (
    <Html>
      <Head />
      <Preview>
        {payout.partnersCount.toString()}{" "}
        {pluralize("partner", payout.partnersCount)} awaiting your payout for{" "}
        {program.name}
      </Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] px-10 py-5">
            <Section className="mb-8 mt-6">
              <Img src={DUB_WORDMARK} width="61" height="32" alt="dub" />
            </Section>

            <Heading className="mx-0 p-0 text-lg font-medium text-neutral-800">
              {payout.partnersCount}{" "}
              {pluralize("partner", payout.partnersCount)} awaiting your payout
              for {program.name}
            </Heading>

            <Text className="text-sm leading-6 text-neutral-600">
              You have some partners awaiting their payout for {program.name}.
              Completing these on time will keep your program running smooth and
              your partners happy.
            </Text>

            <Section className="rounded-lg border border-solid border-neutral-200 p-4">
              <Row>
                <Column className="w-1/2">
                  <Stats
                    title="Total payout amount"
                    icon="https://assets.dub.co/misc/icons/nucleo/money-bills.png"
                    value={currencyFormatter(payout.amount / 100)}
                  />
                </Column>

                <Column className="w-1/2">
                  <Stats
                    title="Partners awaiting payout"
                    icon="https://assets.dub.co/misc/icons/nucleo/users.png"
                    value={payout.partnersCount}
                  />
                </Column>
              </Row>

              <Section className="mt-6 text-center">
                <Link
                  href={`https://app.dub.co/${workspace.slug}/program/payouts?status=pending&sortBy=amount&confirmPayouts=true`}
                  className="box-border block w-full rounded-lg bg-black px-0 py-4 text-center text-sm leading-none text-white no-underline"
                >
                  Review and confirm payouts
                </Link>
              </Section>
            </Section>

            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

const Stats = ({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: string;
}) => {
  return (
    <Row className="flex">
      <Column className="flex h-10 w-10 rounded-md bg-neutral-100" align="left">
        <Img src={icon} alt={title} className="m-auto block h-4 w-4" />
      </Column>
      <Column className="w-3" />
      <Column align="left" className="flex-1">
        <Text className="m-0 text-left text-xs font-medium text-neutral-500">
          {title}
        </Text>
        <Text className="m-0 text-left text-lg font-medium text-neutral-800">
          {value}
        </Text>
      </Column>
    </Row>
  );
};
