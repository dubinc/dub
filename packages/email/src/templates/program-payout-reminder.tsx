import { currencyFormatter, DUB_WORDMARK } from "@dub/utils";
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

// TODO:
// Fix the icons

export function ProgramPayoutReminder({
  email = "panic@thedis.co",
  workspace = {
    slug: "acme",
  },
  program = {
    id: "prog_CYCu7IMAapjkRpTnr8F1azjN",
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
    id: string;
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
      <Preview>Payouts ready to be confirmed for {program.name}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] px-10 py-5">
            <Section className="mb-8 mt-6">
              <Img src={DUB_WORDMARK} width="61" height="32" alt="dub" />
            </Section>

            <Heading className="mx-0 p-0 text-lg font-medium text-neutral-800">
              Payouts ready to be confirmed for {program.name}
            </Heading>

            <Text className="text-sm leading-6 text-neutral-600">
              There are payouts ready to be paid out. Completing these on time
              keep your program running smooth and your partners happy.
            </Text>

            <Section className="rounded-lg border border-solid border-neutral-200 p-6">
              <Row>
                <Column>
                  <Stats
                    title="Pending payouts"
                    icon=""
                    value={currencyFormatter(payout.amount / 100, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  />
                </Column>
                <Column>
                  <Stats
                    title="Partners"
                    icon=""
                    value={payout.partnersCount}
                  />
                </Column>
              </Row>

              <Section className="mt-6 text-center">
                <Link
                  href={`https://app.dub.co/${workspace.slug}/programs/${program.id}/payouts?status=pending&sortBy=amount&confirmPayouts=true`}
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
    <div className="flex w-fit flex-row items-center bg-white">
      <div className="flex h-10 w-10 rounded-md bg-neutral-100">
        <Img src={icon} alt={title} className="m-auto block h-4 w-4" />
      </div>
      <div className="ml-3">
        <p className="m-0 text-left text-xs font-medium text-neutral-500">
          {title}
        </p>
        <p className="m-0 text-left text-lg font-medium text-neutral-800">
          {value}
        </p>
      </div>
    </div>
  );
};

export default ProgramPayoutReminder;
