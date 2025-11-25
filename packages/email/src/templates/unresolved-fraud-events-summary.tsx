import { DUB_WORDMARK, formatDate, OG_AVATAR_URL } from "@dub/utils";
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
        image: `${OG_AVATAR_URL}/Lauren Anderson`,
      },
    },
    {
      name: "Referral source",
      count: 1,
      groupKey: "3kkPeQ8vzIr1Zl5Zsn_A4l06",
      partner: {
        name: "Charlie Anderson",
        image: `${OG_AVATAR_URL}/Charlie Anderson`,
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
    };
  }[];
  email: string;
}) {
  const todayDate = formatDate(new Date(), {
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
              <strong>{todayDate}</strong> for the{" "}
              <strong>{program.name}</strong> program.
            </Text>

            <Section className="my-6 rounded-xl border border-solid border-neutral-200 bg-white p-0">
              <Row className="h-11 border-b border-solid border-neutral-200">
                <Column width="50%" className="px-4">
                  <Text className="m-0 text-sm font-semibold tracking-wide text-neutral-900">
                    Event
                  </Text>
                </Column>
                <Column width="40%" className="px-4">
                  <Text className="m-0 text-sm font-semibold tracking-wide text-neutral-900">
                    Partner
                  </Text>
                </Column>
                <Column width="10%" className="px-4">
                  <Text className="m-0 text-sm font-semibold tracking-wide text-neutral-900"></Text>
                </Column>
              </Row>

              {displayedEvents.map((event) => (
                <Row
                  key={event.groupKey}
                  className="h-11 border-b border-solid border-neutral-200 last:border-b-0"
                >
                  <Column width="50%" className="w-1/2 px-4" valign="middle">
                    <Row>
                      <Column width="auto" className="flex">
                        <Text className="m-0 text-sm font-medium text-neutral-600">
                          {event.name}
                        </Text>

                        <div>
                          {event.count > 1 && (
                            <Text className="m-0 ml-2 rounded-md bg-neutral-100 px-1.5 py-0.5 text-xs font-semibold text-neutral-700">
                              {event.count}
                            </Text>
                          )}
                        </div>
                      </Column>
                    </Row>
                  </Column>

                  <Column width="50%" className="w-1/2 px-4" valign="middle">
                    <Row>
                      <Column width="auto">
                        <Img
                          src={
                            event.partner.image ||
                            `${OG_AVATAR_URL}${event.partner.name}`
                          }
                          width={20}
                          height={20}
                          alt={event.partner.name}
                          className="rounded-full"
                        />
                      </Column>

                      <Column width="auto">
                        <Text className="m-0 ml-1 text-sm font-medium text-neutral-600">
                          {event.partner.name}
                        </Text>
                      </Column>

                      <Column
                        width="10%"
                        className="px-4"
                        align="right"
                        valign="middle"
                      >
                        <Link
                          className="rounded-lg border border-solid border-neutral-300 bg-white px-2.5 py-1.5 text-sm font-medium text-neutral-700 no-underline"
                          href={`https://app.dub.co/${workspace.slug}/program/fraud?groupKey=${event.groupKey}`}
                        >
                          View
                        </Link>
                      </Column>
                    </Row>
                  </Column>
                </Row>
              ))}

              {remainingCount > 0 && (
                <Row className="h-11 rounded-b-xl border-t border-solid border-neutral-200 bg-neutral-50">
                  <Column
                    className="px-4"
                    align="center"
                    valign="middle"
                    colSpan={2}
                  >
                    <Text className="m-0 text-sm font-medium text-neutral-600">
                      Plus {remainingCount} more
                    </Text>
                  </Column>
                </Row>
              )}
            </Section>

            <Section className="mt-6 text-center">
              <Link
                href={`https://app.dub.co/${workspace.slug}/program/fraud`}
                className="box-border block w-full rounded-md bg-black px-4 py-3 text-center text-sm font-medium leading-none text-white no-underline"
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
