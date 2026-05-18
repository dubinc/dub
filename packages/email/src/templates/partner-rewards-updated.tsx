import { DUB_WORDMARK, formatDateTime } from "@dub/utils";
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

type RewardChangeAction = "added" | "updated" | "removed";

const ACTION_LABELS: Record<RewardChangeAction, string> = {
  added: "Added",
  updated: "Updated",
  removed: "Removed",
};

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

  return (
    <Html>
      <Head />
      <Preview>Your rewards have updated</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>

            <Heading className="mx-0 my-7 p-0 text-xl font-semibold text-black">
              Your rewards have updated
            </Heading>

            <Text className="text-sm leading-6 text-neutral-600">
              <strong>{program.name}</strong> has updated their program rewards.
              This update is in effect as of {formattedEffectiveAt} and will
              apply to all future activity.
            </Text>

            {changes.map((change) => (
              <Section
                key={`${change.action}-${change.title}`}
                className="my-6"
              >
                <Text className="my-0 text-base font-semibold text-black">
                  {ACTION_LABELS[change.action]}
                </Text>
                <Section className="mt-3 rounded-[6px] border border-solid border-neutral-200 bg-neutral-50 px-5 py-4">
                  <Row>
                    <Column
                      className="w-[18px]"
                      style={{ verticalAlign: "middle" }}
                    >
                      <Img src={change.icon} height="18" width="18" alt="" />
                    </Column>
                    <Column
                      className="pl-2"
                      style={{ verticalAlign: "middle" }}
                    >
                      <Text className="my-0 text-[14px] font-medium leading-[18px] text-neutral-900">
                        {change.title}
                      </Text>
                    </Column>
                  </Row>
                  <Row>
                    <Column>
                      <Text className="my-1 text-[14px] leading-6 text-neutral-800">
                        {change.description}
                      </Text>
                    </Column>
                  </Row>
                </Section>
              </Section>
            ))}

            <Text className="text-sm leading-6 text-neutral-600">
              If you have any questions about these changes please reach out to
              the <strong>{program.name}</strong> team
              {program.supportEmail ? (
                <>
                  {" "}
                  (
                  <Link
                    href={`mailto:${program.supportEmail}`}
                    className="font-medium text-neutral-700 underline underline-offset-2"
                  >
                    {program.supportEmail}
                  </Link>
                  )
                </>
              ) : (
                <>
                  {" "}
                  <Link
                    href={`https://partners.dub.co/messages/${program.slug}`}
                    className="font-semibold text-neutral-700 underline underline-offset-2"
                  >
                    here ↗
                  </Link>
                </>
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
