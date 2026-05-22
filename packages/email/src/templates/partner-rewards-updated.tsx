import { DUB_WORDMARK, formatDateTime } from "@dub/utils";
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

type RewardChangeAction = "added" | "updated" | "removed";

const ACTION_LABELS: Record<RewardChangeAction, string> = {
  added: "Added",
  updated: "Updated",
  removed: "Removed",
};

const ACTION_ORDER: RewardChangeAction[] = ["added", "updated", "removed"];

export default function PartnerRewardsUpdated({
  program = {
    name: "Acme",
    logo: DUB_WORDMARK,
    slug: "acme",
    supportEmail: "support@getacme.link",
  },
  partner = {
    name: "John Doe",
    email: "panic@thedis.co",
  },
  effectiveAt = new Date("2026-01-02T20:32:00.000Z"),
  changes = [
    {
      action: "added" as RewardChangeAction,
      title: "Sale reward",
      description: "30% per sale for the customers lifetime",
      icon: "https://assets.dub.co/email-assets/icons/invoice-dollar.png",
    },
  ],
}: {
  program: {
    name: string;
    logo: string | null;
    slug: string;
    supportEmail?: string | null;
  };
  partner: {
    name: string;
    email: string;
  };
  effectiveAt: Date | string;
  changes: {
    action: RewardChangeAction;
    title: string;
    description: string;
    icon: string;
  }[];
}) {
  const formattedEffectiveAt = formatDateTime(effectiveAt, {
    timeZoneName: "short",
  });

  const changesByAction = ACTION_ORDER.map((action) => ({
    action,
    items: changes.filter((change) => change.action === action),
  })).filter(({ items }) => items.length > 0);

  return (
    <Html>
      <Head />
      <Preview>
        This update is in effect as of {formattedEffectiveAt} and will apply to
        all future activity.
      </Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mt-8">
              <Img
                src={program.logo || "https://assets.dub.co/wordmark.png"}
                height="32"
                alt={program.name}
              />
            </Section>

            <Heading className="mx-0 my-7 p-0 text-lg font-medium text-black">
              Hi {partner.name}!
            </Heading>

            <Text className="text-sm leading-6 text-neutral-600">
              <strong>{program.name}</strong> has updated your rewards for their
              program:
            </Text>

            {Boolean(changes.length) && (
              <Section className="my-4 rounded-xl border border-solid border-neutral-200 bg-neutral-50 px-5 py-4">
                {changesByAction.map(({ action, items }, index) => (
                  <Section key={action}>
                    <Text
                      className={`mb-0 text-base font-semibold text-black ${index > 0 ? "mt-5" : "mt-0"}`}
                    >
                      {ACTION_LABELS[action]}
                    </Text>
                    {items.map((change) => (
                      <Row
                        key={`${change.action}-${change.title}`}
                        className="mb-0 mt-2"
                      >
                        <Column className="align-center">
                          <Img src={change.icon} height="16" alt="" />
                        </Column>
                        <Column className="w-full pl-2">
                          <Text className="my-0 text-sm font-medium text-neutral-600">
                            {change.description}
                          </Text>
                        </Column>
                      </Row>
                    ))}
                  </Section>
                ))}
              </Section>
            )}

            <Text className="text-sm leading-6 text-neutral-600">
              This update is in effect as of{" "}
              <strong>{formattedEffectiveAt}</strong> and will apply to all
              future activity.
            </Text>

            <Hr className="border-neutral-200" />

            <Section className="mb-8 mt-8">
              <Link
                className="rounded-lg bg-neutral-900 px-6 py-3 text-[13px] font-semibold text-white no-underline"
                href={`https://partners.dub.co/programs/${program.slug}`}
              >
                Go to your dashboard
              </Link>
            </Section>

            <Text className="text-sm leading-6 text-neutral-600">
              If you have any questions about these changes, please{" "}
              {program.supportEmail ? (
                <>
                  reach out to the <strong>{program.name}</strong> team (
                  <Link
                    href={`mailto:${program.supportEmail}`}
                    className="font-semibold text-neutral-700 underline underline-offset-2"
                  >
                    {program.supportEmail}
                  </Link>
                  )
                </>
              ) : (
                <Link
                  href={`https://partners.dub.co/messages/${program.slug}`}
                  className="font-semibold text-neutral-700 underline underline-offset-2"
                >
                  reach out to the {program.name} team ↗
                </Link>
              )}
              .
            </Text>

            <Footer
              email={partner.email}
              notificationSettingsUrl="https://partners.dub.co/profile/notifications"
            />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
