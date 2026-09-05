import {
  currencyFormatter,
  DUB_LOGO,
  DUB_WORDMARK,
  nFormatter,
} from "@dub/utils";
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

const PARTNERS_URL = "https://partners.dub.co";

// The top programs get a card with full stats, the rest are listed in a compact table
const MAX_PROGRAM_CARDS = 3;

const ICONS = {
  earnings: "https://assets.dub.co/misc/icons/nucleo/money-bills.png",
  clicks: "https://assets.dub.co/misc/icons/nucleo/cursor-rays.png",
  leads: "https://assets.dub.co/misc/icons/nucleo/user-plus.png",
  sales: "https://assets.dub.co/misc/icons/nucleo/invoice-dollar.png",
} as const;

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
    color: "bg-neutral-100 text-neutral-700",
    sign: "",
  },
};

type MonthMetrics = {
  earnings: number;
  clicks: number;
  leads: number;
  sales: number;
};

type ProgramSummary = {
  id: string;
  name: string;
  logo: string | null;
  slug: string;
  previousMonth: MonthMetrics;
  currentMonth: MonthMetrics;
};

type ReportingPeriod = {
  month: string;
  start: string;
  end: string;
};

function getPercentChange(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }

  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

function getPercentState(percent: number) {
  if (percent > 0) {
    return percentStateMap.positive;
  }

  if (percent < 0) {
    return percentStateMap.negative;
  }

  return percentStateMap.neutral;
}

function getProgramLogo(program: Pick<ProgramSummary, "logo">) {
  return program.logo || DUB_LOGO;
}

function getProgramUrl(
  program: Pick<ProgramSummary, "slug">,
  reportingPeriod: ReportingPeriod,
) {
  return `${PARTNERS_URL}/programs/${program.slug}?start=${reportingPeriod.start}&end=${reportingPeriod.end}`;
}

const SAMPLE_METRICS = {
  previousMonth: {
    earnings: 100000,
    clicks: 364,
    leads: 182,
    sales: 102,
  },
  currentMonth: {
    earnings: 100000,
    clicks: 400,
    leads: 200,
    sales: 100,
  },
};

const SAMPLE_PROGRAMS: ProgramSummary[] = [
  "Framer",
  "Acme",
  "Guideless",
  "Granola",
  "Fillout",
  "Firecrawl",
  "Wispr Flow",
  "Superhuman",
  "Dub",
  "Tella",
].map((name, index) => ({
  id: `prog_${index + 1}`,
  name,
  logo: null,
  slug: name.toLowerCase().replace(/\s+/g, "-"),
  previousMonth: SAMPLE_METRICS.previousMonth,
  currentMonth: {
    ...SAMPLE_METRICS.currentMonth,
    earnings: Math.max(0, 100000 - index * 20000),
  },
}));

export default function PartnerProgramSummary({
  email = "panic@thedis.co",
  reportingPeriod = {
    month: "August 2026",
    start: "2026-08-01T00:00:00.000Z",
    end: "2026-08-31T23:59:59.999Z",
  },
  programs = SAMPLE_PROGRAMS,
}: {
  email: string;
  reportingPeriod: ReportingPeriod;
  programs: ProgramSummary[];
}) {
  const programCards = programs.slice(0, MAX_PROGRAM_CARDS);
  const programRows = programs.slice(MAX_PROGRAM_CARDS);

  return (
    <Html>
      <Head />
      <Preview>
        See how you performed across your top Dub programs in{" "}
        {reportingPeriod.month}, compared with the previous month.
      </Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] px-10 py-5">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>

            <Heading className="mx-0 mb-1 mt-10 p-0 text-lg font-semibold leading-7 text-neutral-800">
              {reportingPeriod.month} program summary
            </Heading>

            <Text className="m-0 text-sm leading-5 text-neutral-600">
              See how you performed across your top Dub programs, compared with
              the previous month.
            </Text>

            {programCards.map((program) => (
              <ProgramCard
                key={program.id}
                program={program}
                reportingPeriod={reportingPeriod}
              />
            ))}

            {programRows.length > 0 && (
              <ProgramTable
                programs={programRows}
                reportingPeriod={reportingPeriod}
              />
            )}

            <Section className="mt-5">
              <Link
                href={`${PARTNERS_URL}/programs`}
                className="box-border inline-block rounded-lg bg-neutral-900 px-3.5 py-2 text-sm font-medium leading-5 text-white no-underline"
              >
                View all programs
              </Link>
            </Section>

            <Footer
              email={email}
              notificationSettingsUrl={`${PARTNERS_URL}/profile/notifications`}
            />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

const ProgramCard = ({
  program,
  reportingPeriod,
}: {
  program: ProgramSummary;
  reportingPeriod: ReportingPeriod;
}) => {
  const { previousMonth, currentMonth } = program;

  const stats = [
    {
      title: "Earnings",
      icon: ICONS.earnings,
      value: currencyFormatter(currentMonth.earnings),
      percent: getPercentChange(currentMonth.earnings, previousMonth.earnings),
    },
    {
      title: "Clicks",
      icon: ICONS.clicks,
      value: nFormatter(currentMonth.clicks),
      percent: getPercentChange(currentMonth.clicks, previousMonth.clicks),
    },
    {
      title: "Leads",
      icon: ICONS.leads,
      value: nFormatter(currentMonth.leads),
      percent: getPercentChange(currentMonth.leads, previousMonth.leads),
    },
    {
      title: "Sales",
      icon: ICONS.sales,
      value: nFormatter(currentMonth.sales),
      percent: getPercentChange(currentMonth.sales, previousMonth.sales),
    },
  ];

  return (
    <Section className="mt-5 rounded-xl border border-solid border-neutral-200 bg-neutral-50">
      <Section className="rounded-t-xl px-3 py-2.5">
        <Row>
          <Column width={28} valign="middle">
            <Img
              src={getProgramLogo(program)}
              width="20"
              height="20"
              alt={program.name}
              className="rounded-full"
            />
          </Column>
          <Column
            valign="middle"
            className="text-sm font-semibold leading-5 text-neutral-800"
          >
            {program.name}
          </Column>
          <Column align="right" valign="middle">
            <Link
              href={getProgramUrl(program, reportingPeriod)}
              className="box-border inline-block rounded-lg bg-neutral-900 px-2.5 py-1 text-sm font-medium leading-5 text-white no-underline"
              style={{ whiteSpace: "nowrap" }}
            >
              View dashboard
            </Link>
          </Column>
        </Row>
      </Section>

      <Section className="rounded-xl border-t border-solid border-neutral-200 bg-white p-4">
        {[0, 2].map((startIndex) => (
          <Row
            key={startIndex}
            style={{
              width: "100%",
              ...(startIndex === 2 && { marginTop: "20px" }),
            }}
          >
            <Column width="50%" style={{ paddingRight: "12px" }}>
              <Stat {...stats[startIndex]} />
            </Column>
            <Column width="50%" style={{ paddingLeft: "12px" }}>
              <Stat {...stats[startIndex + 1]} />
            </Column>
          </Row>
        ))}
      </Section>
    </Section>
  );
};

const Stat = ({
  title,
  icon,
  value,
  percent,
}: {
  title: string;
  icon: string;
  value: string;
  percent: number;
}) => {
  return (
    <Row>
      <Column width={48} valign="middle">
        <div className="box-border h-9 w-9 rounded-md border border-solid border-neutral-200 text-center leading-9">
          <Img
            src={icon}
            alt={title}
            width="18"
            height="18"
            className="inline-block align-middle"
          />
        </div>
      </Column>
      <Column valign="middle">
        <Text className="m-0 text-xs font-medium leading-4 text-neutral-500">
          {title}
        </Text>
        <Text className="m-0 text-sm font-medium leading-5 text-neutral-800">
          {value}
          <PercentBadge percent={percent} className="ml-1.5" />
        </Text>
      </Column>
    </Row>
  );
};

const PercentBadge = ({
  percent,
  className,
}: {
  percent: number;
  className?: string;
}) => {
  const { color, sign } = getPercentState(percent);

  return (
    <span
      className={`rounded px-1 py-0.5 text-xs font-medium leading-4 ${color} ${className ?? ""}`}
    >
      {/* "–" means no change compared to the previous month */}
      {percent === 0 ? "–" : `${sign}${Math.abs(percent)}%`}
    </span>
  );
};

const ProgramTable = ({
  programs,
  reportingPeriod,
}: {
  programs: ProgramSummary[];
  reportingPeriod: ReportingPeriod;
}) => {
  return (
    <Section className="mt-5">
      <Row>
        <Column className="pb-2.5 text-xs font-medium leading-4 text-neutral-500">
          Program
        </Column>
        <Column
          align="right"
          className="pb-2.5 text-xs font-medium leading-4 text-neutral-500"
        >
          Earnings
        </Column>
        <Column
          width={48}
          className="pb-2.5 pl-5 text-xs font-medium leading-4 text-neutral-500"
        >
          Change
        </Column>
      </Row>

      {programs.map((program) => {
        const programUrl = getProgramUrl(program, reportingPeriod);

        return (
          <Row key={program.id}>
            <Column className="py-2.5">
              <Row>
                <Column width={28} valign="middle">
                  <Link href={programUrl}>
                    <Img
                      src={getProgramLogo(program)}
                      width="20"
                      height="20"
                      alt={program.name}
                      className="rounded-full"
                    />
                  </Link>
                </Column>
                <Column valign="middle">
                  <Link
                    href={programUrl}
                    className="text-sm font-semibold leading-5 text-neutral-800 no-underline"
                  >
                    {program.name}
                  </Link>
                </Column>
              </Row>
            </Column>
            <Column align="right" valign="middle" className="py-2.5">
              <Link
                href={programUrl}
                className="text-sm leading-5 text-neutral-800 no-underline"
              >
                {currencyFormatter(program.currentMonth.earnings)}
              </Link>
            </Column>
            <Column width={48} valign="middle" className="py-2.5 pl-5">
              <Link href={programUrl} className="no-underline">
                <PercentBadge
                  percent={getPercentChange(
                    program.currentMonth.earnings,
                    program.previousMonth.earnings,
                  )}
                />
              </Link>
            </Column>
          </Row>
        );
      })}
    </Section>
  );
};
