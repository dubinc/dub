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

const MAX_DISPLAYED_GROUPS = 5;

export default function UnresolvedFraudEventsSummary({
  workspace = {
    slug: "acme",
  },
  program = {
    name: "Acme",
  },
  fraudGroups = [
    {
      id: "frg_1KBEY53HESGDK7RAPX960FEWA",
      name: "Customer email match",
      count: 2,
      partner: {
        name: "Lauren Anderson",
        image: `${OG_AVATAR_URL}Lauren Anderson`,
      },
    },
    {
      id: "frg_1KBEZRKC1GB716J5AKV62MK8H",
      name: "Referral source",
      count: 1,
      partner: {
        name: "Charlie Anderson",
        image: `${OG_AVATAR_URL}Charlie Anderson`,
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
  fraudGroups: {
    id: string;
    name: string;
    count: number;
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

  const displayedGroups = fraudGroups.slice(0, MAX_DISPLAYED_GROUPS);
  const remainingCount = fraudGroups.length - MAX_DISPLAYED_GROUPS;
  const hiddenCount = Math.max(0, remainingCount);

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
              {displayedGroups.map((group, index) => {
                const isLastDisplayedItem =
                  index === displayedGroups.length - 1;
                const shouldShowBottomBorder = !isLastDisplayedItem;
                return (
                  <Row
                    key={group.id}
                    className={`border-solid border-neutral-200 ${
                      shouldShowBottomBorder ? "border-b" : ""
                    }`}
                  >
                    <Column className="px-3 py-3" valign="middle">
                      <Row>
                        <Column width="32" valign="middle">
                            <Img
                              src={
                                group.partner.image ||
                                `${OG_AVATAR_URL}${group.partner.name}`
                              }
                              width={32}
                              height={32}
                              alt={group.partner.name}
                            className="rounded-full"
                          />
                        </Column>

                        <Column className="pl-2 pt-1" valign="middle">
                          <Text className="m-0 text-sm font-medium leading-[16px] text-neutral-800">
                            {group.partner.name}
                          </Text>

                          <div className="mt-0">
                            <span className="m-0 inline text-xs font-medium text-neutral-500">
                              {group.name}
                            </span>
                            {group.count > 1 && (
                              <span className="m-0 ml-1 inline rounded-md bg-neutral-100 px-1 py-0 text-xs font-semibold text-neutral-700">
                                {group.count}
                              </span>
                            )}
                          </div>
                        </Column>

                        <Column align="right" valign="middle">
                          <Link
                            className="inline-block rounded-lg border border-solid border-neutral-300 bg-white px-2.5 py-1.5 text-sm font-medium text-neutral-800 no-underline"
                            href={`https://app.dub.co/${workspace.slug}/program/fraud?groupId=${group.id}`}
                          >
                            View
                          </Link>
                        </Column>
                      </Row>
                    </Column>
                  </Row>
                );
              })}

              {hiddenCount > 0 && (
                <Row className="h-11 rounded-b-xl border-t border-solid border-neutral-200 bg-neutral-50">
                  <Column
                    className="px-4"
                    align="center"
                    valign="middle"
                    colSpan={2}
                  >
                    <Text className="m-0 text-sm font-medium text-neutral-600">
                      Plus {hiddenCount} more
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
                Review all events
              </Link>
            </Section>

            <Footer
              email={email}
              notificationSettingsUrl={`https://app.dub.co/${workspace.slug}/settings/notifications`}
            />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
