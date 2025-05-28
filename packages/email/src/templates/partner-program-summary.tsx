import { DUB_WORDMARK } from "@dub/utils";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
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
  },
  currentMonth: monthlyPerformance = {
    clicks: 100,
    leads: 100,
    sales: 100,
    earnings: 100,
  },
  lifetime: lifetimePerformance = {
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
}) {
  const monthlyStats = [
    {
      title: "Clicks",
      value: monthlyPerformance.clicks,
    },
    {
      title: "Leads",
      value: monthlyPerformance.leads,
    },
    {
      title: "Sales",
      value: monthlyPerformance.sales,
    },
    {
      title: "Earnings",
      value: monthlyPerformance.earnings,
    },
  ];

  const lifetimeStats = [
    {
      title: "Clicks",
      value: lifetimePerformance.clicks,
    },
    {
      title: "Leads",
      value: lifetimePerformance.leads,
    },
    {
      title: "Sales",
      value: lifetimePerformance.sales,
    },
    {
      title: "Earnings",
      value: lifetimePerformance.earnings,
    },
  ];

  const currentMonth = new Date().toLocaleString("en-US", {
    month: "long",
  });

  return (
    <Html>
      <Head />
      <Preview>{`Your ${currentMonth} performance report for ${program.name} program.`}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] space-y-10 rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mt-8">
              <Img
                src={program.logo || DUB_WORDMARK}
                height="32"
                alt={program.name}
              />
            </Section>

            <Heading className="mx-0 mt-[40px] p-0 text-lg font-medium text-black">
              {program.name} partner program monthly summary
            </Heading>

            <Text className="text-sm text-neutral-600">
              Here's a summary of your activity for the month of {currentMonth}.
            </Text>

            <Section className="mb-8">
              <Heading
                as="h4"
                className="text-base font-semibold leading-6 text-neutral-800"
              >
                Monthly Stats
              </Heading>

              <div className="grid grid-cols-2 gap-x-3 gap-y-8">
                {monthlyStats.map((stat) => (
                  <Stats key={stat.title} {...stat} />
                ))}
              </div>
            </Section>

            <Hr className="mx-0 w-full border border-neutral-200" />

            <Section className="mb-8">
              <Heading
                as="h4"
                className="text-base font-semibold leading-6 text-neutral-800"
              >
                All-time Performance
              </Heading>

              <div className="grid grid-cols-2 gap-x-3 gap-y-8">
                {lifetimeStats.map((stat) => (
                  <Stats key={stat.title} {...stat} />
                ))}
              </div>
            </Section>

            <Section className="mt-8 text-center">
              <Link
                href={`https://partners.dub.co/programs/${program.slug}`}
                className="box-border block w-full rounded-lg bg-black px-0 py-4 text-center text-sm font-semibold leading-none text-white no-underline"
              >
                View dashboard
              </Link>
            </Section>

            <Footer email={partner.email!} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

const Stats = ({ title, value }: { title: string; value: number }) => {
  const icon = ICONS[title.toLowerCase() as Icon];

  return (
    <div className="flex flex-row items-center gap-3 bg-white p-0">
      <div className="flex h-12 w-12 items-center justify-center rounded-md bg-neutral-100">
        <img src={icon} alt={title} className="h-6 w-6" />
      </div>

      <div className="flex flex-col justify-center">
        <p className="mb-1 mt-0 text-left text-xs font-medium text-neutral-500">
          {title}
        </p>
        <p className="m-0 text-left text-lg font-medium text-neutral-800">
          {value}
        </p>
      </div>
    </div>
  );
};

export default PartnerProgramSummary;
