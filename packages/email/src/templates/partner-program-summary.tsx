import { DUB_WORDMARK, formatDateTime, nFormatter } from "@dub/utils";
import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Hr,
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

const ICONS = {
  clicks: "https://react.email/static/atmos-vacuum-canister.jpg",
  leads: "https://react.email/static/atmos-vacuum-canister.jpg",
  sales: "https://react.email/static/atmos-vacuum-canister.jpg",
  earnings: "https://react.email/static/atmos-vacuum-canister.jpg",
} as const;

type Icon = keyof typeof ICONS;

export function PartnerProgramSummary({
  program = {
    name: "Acme",
    logo: DUB_WORDMARK,
    slug: "acme",
  },
  partner = {
    email: "panic@thedis.co",
    createdAt: new Date(),
  },
  previousMonth = {
    clicks: 100,
    leads: 100,
    sales: 100,
    earnings: 100,
  },
  lifetime = {
    clicks: 200,
    leads: 200,
    sales: 200,
    earnings: 200,
  },
}: {
  program: {
    name: string;
    logo: string | null;
    slug: string;
  };
  partner: {
    email: string | null;
    createdAt: Date;
  };
  previousMonth: {
    clicks: number;
    leads: number;
    sales: number;
    earnings: number;
  };
  lifetime: {
    clicks: number;
    leads: number;
    sales: number;
    earnings: number;
  };
}) {
  const monthlyStats = [
    {
      title: "Clicks",
      value: previousMonth.clicks,
    },
    {
      title: "Leads",
      value: previousMonth.leads,
    },
    {
      title: "Sales",
      value: previousMonth.sales,
    },
    {
      title: "Earnings",
      value: previousMonth.earnings,
    },
  ];

  const lifetimeStats = [
    {
      title: "Clicks",
      value: lifetime.clicks,
    },
    {
      title: "Leads",
      value: lifetime.leads,
    },
    {
      title: "Sales",
      value: lifetime.sales,
    },
    {
      title: "Earnings",
      value: lifetime.earnings,
    },
  ];

  const month = new Date().toLocaleString("en-US", {
    month: "long",
  });

  return (
    <Html>
      <Head />
      <Preview>{`Your ${month} performance report for ${program.name} program.`}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] space-y-10 px-3 py-5">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt={program.name} />
            </Section>

            <Heading className="mx-0 mt-[40px] p-0 text-lg font-medium text-black">
              {program.name} partner program monthly summary
            </Heading>

            <Text className="mt-1 text-sm text-neutral-600">
              Here's a summary of your activity for the month of {month}
            </Text>

            <Section className="mt-10 rounded-xl border border-solid border-neutral-200 bg-neutral-50">
              <Section className="rounded-t-xl px-6 py-5">
                <div className="flex items-center">
                  <Img
                    src={program.logo || DUB_WORDMARK}
                    alt={program.name}
                    height="32"
                    width="32"
                    className="mr-4 rounded-md"
                  />

                  <div>
                    <div className="text-base font-semibold leading-tight text-neutral-800">
                      {program.name}
                    </div>
                    <div className="text-xs font-medium text-neutral-500">
                      Partner since{" "}
                      {formatDateTime(partner.createdAt, {
                        month: "long",
                        year: "numeric",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                </div>
              </Section>

              <Section className="space-y-6 rounded-xl border-t border-solid border-neutral-200 bg-white p-6">
                <Section>
                  <Heading
                    as="h4"
                    className="mt-0 text-base font-semibold leading-6 text-neutral-800"
                  >
                    Monthly Stats
                  </Heading>

                  <StatsGrid stats={monthlyStats} />
                </Section>

                <Hr className="mx-0 my-8 w-full border border-neutral-200" />

                <Section>
                  <Heading
                    as="h4"
                    className="mt-0 text-base font-semibold leading-6 text-neutral-800"
                  >
                    All-time Performance
                  </Heading>

                  <StatsGrid stats={lifetimeStats} />
                </Section>

                <Section className="mt-8 text-center">
                  <Link
                    href={`https://partners.dub.co/programs/${program.slug}`}
                    className="box-border block w-full rounded-lg bg-black px-0 py-4 text-center text-sm font-semibold leading-none text-white no-underline"
                  >
                    View dashboard
                  </Link>
                </Section>
              </Section>
            </Section>

            <Footer email={partner.email!} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

const StatsGrid = ({
  stats,
}: {
  stats: {
    title: string;
    value: number;
  }[];
}) => {
  return (
    <>
      {[0, 2].map((startIndex) => (
        <Row
          key={startIndex}
          style={{
            width: "100%",
            ...(startIndex === 2 && { marginTop: "32px" }),
          }}
        >
          <Column style={{ width: "50%", paddingRight: "12px" }}>
            <Stats {...stats[startIndex]} />
          </Column>
          <Column style={{ width: "50%" }}>
            <Stats {...stats[startIndex + 1]} />
          </Column>
        </Row>
      ))}
    </>
  );
};

const Stats = ({ title, value }: { title: string; value: number }) => {
  const icon = ICONS[title.toLowerCase() as Icon];

  return (
    <div className="flex flex-row items-center gap-3 bg-white p-0">
      <div className="flex h-12 w-12 items-center justify-center rounded-md bg-neutral-100">
        <img src={icon} alt={title} className="h-4 w-4" />
      </div>

      <div className="flex flex-col justify-center">
        <p className="mb-1 mt-0 text-left text-xs font-medium text-neutral-500">
          {title}
        </p>
        <p className="m-0 text-left text-lg font-medium text-neutral-800">
          {nFormatter(value)}
        </p>
      </div>
    </div>
  );
};

export default PartnerProgramSummary;
