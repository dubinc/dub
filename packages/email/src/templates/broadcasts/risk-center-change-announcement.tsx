import { DUB_WORDMARK, OG_AVATAR_URL } from "@dub/utils";
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
import { Footer } from "../../components/footer";

const MAX_DISPLAYED_GROUPS = 5;

export default function RiskCenterChangeAnnouncement({
  email = "panic@thedis.co",
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
}: {
  email: string;
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
}) {
  const displayedGroups = fraudGroups.slice(0, MAX_DISPLAYED_GROUPS);
  const remainingCount = fraudGroups.length - MAX_DISPLAYED_GROUPS;
  const hiddenCount = Math.max(0, remainingCount);

  return (
    <Html>
      <Head>
        <style>{`
          @media only screen and (max-width: 600px) {
            .email-container {
              padding-left: 16px !important;
              padding-right: 16px !important;
            }
          }
        `}</style>
      </Head>
      <Preview>
        Risk events now expire after 30 days if left unresolved, please review
        them before they expire.
      </Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="email-container mx-auto my-10 max-w-[600px] px-10 py-5">
            <Section className="mt-2">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>

            <Heading className="mx-0 mb-2 mt-10 text-xl font-semibold text-black">
              Important updates to your Dub program
            </Heading>

            <Text className="text-sm leading-6 text-neutral-600">
              We've made some important changes to the fraud detection tools for
              your <strong className="text-black">{program.name}</strong>{" "}
              program on Dub that we wanted to let you know about.
            </Text>

            <Text className="mt-0 text-sm leading-6 text-neutral-600">
              Unresolved risk events will now{" "}
              <strong className="text-black">
                automatically expire after 30 days
              </strong>{" "}
              if no new activity is detected. This is to ensure there are no
              delay in partner payouts due to unresolved risk events.
            </Text>

            <Text className="text-sm leading-6 text-neutral-600">
              You currently have pending risk events for your program – please
              review them before they expire:
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
                            href={`https://app.dub.co/${workspace.slug}/program/risks?groupId=${group.id}`}
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

            <Text className="mt-0 text-sm leading-6 text-neutral-600">
              To give you more time to review them, we've extended the
              expiration period for all events to July 9th, 2026 (30 days from
              now).
            </Text>

            <Text className="mt-0 text-sm leading-6 text-neutral-600">
              Last but not least, the{" "}
              <strong className="text-black">Fraud Detection</strong> tab has
              been renamed to{" "}
              <strong className="text-black">Risk Center</strong>. All existing
              events, rules, and settings remain unchanged – just the names that
              are different.
            </Text>

            <Section className="mb-10 mt-4">
              <Link
                href={`https://app.dub.co/${workspace.slug}/program/risks`}
                className="block w-full rounded-lg bg-neutral-900 py-2.5 text-center text-sm font-medium text-white no-underline"
                style={{
                  backgroundColor: "#171717",
                  color: "#ffffff",
                  borderRadius: "8px",
                  padding: "10px 16px",
                  textDecoration: "none",
                  fontWeight: "500",
                  fontSize: "14px",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              >
                Go to Risk Center
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
