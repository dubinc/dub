import {
  currencyFormatter,
  DUB_LOGO,
  DUB_WORDMARK,
  formatDate,
  nFormatter,
} from "@dub/utils";
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
  clicks: "https://assets.dub.co/misc/icons/nucleo/cursor-rays.png",
  leads: "https://assets.dub.co/misc/icons/nucleo/user-plus.png",
  sales: "https://assets.dub.co/misc/icons/nucleo/invoice-dollar.png",
  earnings: "https://assets.dub.co/misc/icons/nucleo/money-bills.png",
} as const;

type Icon = keyof typeof ICONS;

const percentStateMap = {
  positive: {
    color: "bg-green-50 text-green-700",
    sign: "+",
  },
  negative: {
    color: "bg-red-50 text-red-700",
    sign: "-",
  },
  neutral: {
    color: "bg-neutral-50 text-neutral-700",
    sign: "",
  },
};

function getPercentChange(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }

  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

function getPercentState(percent?: number) {
  if (typeof percent !== "number") {
    return percentStateMap.neutral;
  }

  if (percent > 0) {
    return percentStateMap.positive;
  }

  if (percent < 0) {
    return percentStateMap.negative;
  }

  return percentStateMap.neutral;
}

export default function PartnerProgramSummary({
  program = {
    name: "Acme",
    logo: DUB_LOGO,
    slug: "acme",
  },
  partner = {
    email: "panic@thedis.co",
    createdAt: new Date(),
  },
  previousMonth = {
    clicks: 200,
    leads: 300,
    sales: 50,
    earnings: 100,
  },
  currentMonth = {
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
  reportingPeriod = {
    month: "May 2025",
    start: "2025-05-01T00:00:00.000Z",
    end: "2025-05-31T23:59:59.999Z",
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
  currentMonth: {
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
  reportingPeriod: {
    month: string;
    start: string;
    end: string;
  };
}) {
  const monthlyStats = [
    {
      title: "Clicks",
      value: nFormatter(currentMonth.clicks),
      percent: getPercentChange(currentMonth.clicks, previousMonth.clicks),
    },
    {
      title: "Leads",
      value: nFormatter(currentMonth.leads),
      percent: getPercentChange(currentMonth.leads, previousMonth.leads),
    },
    {
      title: "Sales",
      value: nFormatter(currentMonth.sales),
      percent: getPercentChange(currentMonth.sales, previousMonth.sales),
    },
    {
      title: "Earnings",
      value: currencyFormatter(currentMonth.earnings),
      percent: getPercentChange(currentMonth.earnings, previousMonth.earnings),
    },
  ];

  const lifetimeStats = [
    {
      title: "Clicks",
      value: nFormatter(lifetime.clicks),
    },
    {
      title: "Leads",
      value: nFormatter(lifetime.leads),
    },
    {
      title: "Sales",
      value: nFormatter(lifetime.sales),
    },
    {
      title: "Earnings",
      value: currencyFormatter(lifetime.earnings),
    },
  ];

  return (
    <Html>
      <Head />
      <Preview>{`Your ${reportingPeriod.month} performance report for ${program.name} program.`}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] gap-y-10 px-3 py-5">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt={program.name} />
            </Section>

            <Heading className="mx-0 mt-[40px] p-0 text-lg font-medium text-black">
              {program.name} partner program monthly summary (
              {reportingPeriod.month})
            </Heading>

            <Section className="mt-6 rounded-xl border border-solid border-neutral-200 bg-neutral-50">
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
                      {formatDate(partner.createdAt, { month: "short" })}
                    </div>
                  </div>
                </div>
              </Section>

              <Section className="gap-y-6 rounded-xl border-t border-solid border-neutral-200 bg-white p-6">
                <Section>
                  <Heading
                    as="h4"
                    className="mt-0 text-base font-semibold leading-6 text-neutral-800"
                  >
                    Stats for {reportingPeriod.month} (vs previous month)
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
                    href={`https://partners.dub.co/programs/${program.slug}?start=${reportingPeriod.start}&end=${reportingPeriod.end}`}
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
    value: number | string;
    percent?: number;
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
          <Column width="50%">
            <Stats {...stats[startIndex]} />
          </Column>
          <Column width="50%">
            <Stats {...stats[startIndex + 1]} />
          </Column>
        </Row>
      ))}
    </>
  );
};

const Stats = ({
  title,
  value,
  percent,
}: {
  title: string;
  value: number | string;
  percent?: number;
}) => {
  const icon = ICONS[title.toLowerCase() as Icon];
  const { color, sign } = getPercentState(percent);

  return (
    <div className="flex flex-row items-center bg-white p-0">
      <div className="flex rounded-md bg-neutral-100 p-3">
        <Img src={icon} alt={title} className="h-4 w-4" draggable={false} />
      </div>
      <div className="ml-3">
        <p className="mb-0 mt-0 text-left text-xs font-medium text-neutral-500">
          {title}
        </p>
        <div className="flex items-center">
          <p className="m-0 text-left text-lg font-medium text-neutral-800">
            {value}
          </p>

          {typeof percent === "number" && (
            <Text
              className={`m-0 ml-2 rounded text-xs font-medium ${color} m-auto px-1.5 py-0.5`}
            >
              {sign}
              {Math.abs(percent)}%
            </Text>
          )}
        </div>
      </div>
    </div>
  );
};
