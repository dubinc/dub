import { DUB_WORDMARK, formatDate, nFormatter, OG_AVATAR_URL } from "@dub/utils";
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

const MAX_DISPLAYED_EVENTS = 5;

export default function UnresolvedFraudEventsSummary({
  workspace = {
    slug: "acme",
  },
  program = {
    name: "Acme",
  },
  fraudEvents = [
    {
      name: "Customer email match",
      count: 2,
      groupKey: "QwRUVRbcTfa8zzrhDjGwdN9L",
      partner: {
        name: "Lauren Anderson",
        image: "https://assets.dub.co/logo.png",
      },
    },
    {
      name: "Referral source",
      count: 1,
      groupKey: "3kkPeQ8vzIr1Zl5Zsn_A4l06",
      partner: {
        name: "Charlie Anderson",
        image: "https://assets.dub.co/logo.png",
      },
    },
  ],
  email = "panic@thedis.co",
}: {
  workspace: {
    slug: string;
  };
  program: {
    name: string;
  };
  fraudEvents: {
    name: string;
    count: number;
    groupKey: string;
    partner: {
      name: string;
      image: string | null;
    } | null;
  }[];
  email: string;
}) {
  const totalCount = fraudEvents.reduce((acc, event) => acc + event.count, 0);
  const totalCountText = nFormatter(totalCount, { full: true });

  const formattedDate = formatDate(new Date(), {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const displayedEvents = fraudEvents.slice(0, MAX_DISPLAYED_EVENTS);
  const remainingCount = fraudEvents.length - MAX_DISPLAYED_EVENTS;

  return (
    <Html>
      <Head />
      <Preview>Fraud detection events</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-8 max-w-[600px] px-8 py-8">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>

            <Heading className="mx-0 my-8 p-0 text-lg font-medium text-black">
              Fraud detection events
            </Heading>

            <Text className="text-sm text-neutral-600">
              Here are your detected fraud and risk events reported for{" "}
              {formattedDate} for the program {program.name}.
            </Text>

            <Section className="my-6 rounded-lg border-2 border-dashed border-blue-200 bg-white p-0">
              {/* Table Header */}
              <Row className="border-b border-solid border-neutral-200">
                <Column width="50%" className="px-4 py-3">
                  <Text className="m-0 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Event
                  </Text>
                </Column>
                <Column width="50%" className="px-4 py-3">
                  <Text className="m-0 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Partner
                  </Text>
                </Column>
              </Row>

              {/* Table Rows */}
              {displayedEvents.map((event, idx) => (
                <Row key={event.groupKey}>
                  <Column
                    width="50%"
                    className={`px-4 py-3 ${idx < displayedEvents.length - 1 ? "border-b border-solid border-neutral-200" : ""}`}
                  >
                    <Text className="m-0 text-sm text-neutral-900">
                      {event.name}
                      {event.count > 1 && (
                        <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                          {event.count}
                        </span>
                      )}
                    </Text>
                  </Column>
                  <Column
                    width="50%"
                    className={`px-4 py-3 ${idx < displayedEvents.length - 1 ? "border-b border-solid border-neutral-200" : ""}`}
                  >
                    {event.partner ? (
                      <Row>
                        <Column width="auto">
                          <Img
                            src={
                              event.partner.image ||
                              `${OG_AVATAR_URL}${event.partner.name}`
                            }
                            width="32"
                            height="32"
                            alt={event.partner.name}
                            className="rounded-full"
                          />
                        </Column>
                        <Column className="pl-2">
                          <Text className="m-0 text-sm text-neutral-900">
                            {event.partner.name}
                          </Text>
                        </Column>
                        <Column width="auto" className="align-top">
                          <Link
                            className="rounded-md border border-solid border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 no-underline"
                            href={`https://app.dub.co/${workspace.slug}/program/fraud?groupKey=${event.groupKey}`}
                          >
                            View
                          </Link>
                        </Column>
                      </Row>
                    ) : (
                      <Text className="m-0 text-sm text-neutral-500">
                        No partner
                      </Text>
                    )}
                  </Column>
                </Row>
              ))}

              {/* Footer with "Plus X more" */}
              {remainingCount > 0 && (
                <Row>
                  <Column width="100%" className="px-4 py-3 text-center">
                    <Text className="m-0 text-sm text-neutral-500">
                      Plus {remainingCount} more
                    </Text>
                  </Column>
                </Row>
              )}
            </Section>

            <Section className="mb-10 mt-6">
              <Link
                className="rounded-lg bg-neutral-900 px-6 py-3 text-[13px] font-medium text-white no-underline"
                href={`https://app.dub.co/${workspace.slug}/program/fraud`}
              >
                Review events
              </Link>
            </Section>

            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
