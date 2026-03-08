import { DUB_WORDMARK } from "@dub/utils";
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

export default function PartnerGroupChanged({
  program = {
    name: "Acme",
    logo: DUB_WORDMARK,
    slug: "acme",
  },
  partner = {
    name: "John Doe",
    email: "panic@thedis.co",
  },
  rewards = [
    {
      icon: "https://assets.dub.co/email-assets/icons/invoice-dollar.png",
      label: "Earn up to 65% per sale for 1 year",
    },
    {
      icon: "https://assets.dub.co/email-assets/icons/gift.png",
      label: "New users get 20% off for 3 months",
    },
  ],
  bounties = [
    {
      icon: "https://assets.dub.co/email-assets/icons/heart.png",
      label: "Create a YouTube video about Acme",
    },
    {
      icon: "https://assets.dub.co/email-assets/icons/trophy.png",
      label: "Earn $100 after generating $1,000 in revenue",
    },
  ],
}: {
  program: {
    name: string;
    logo: string | null;
    slug: string;
  };
  partner: {
    name: string;
    email: string;
  };
  rewards?: { icon: string; label: string }[] | null;
  bounties?: { icon: string; label: string }[] | null;
}) {
  return (
    <Html>
      <Head />
      <Preview>
        You've been moved to a new partner group in {program.name}'s program!
      </Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mt-8">
              <Img
                src={program.logo || "https://assets.dub.co/logo.png"}
                height="32"
                alt={program.name}
              />
            </Section>

            <Heading className="mx-0 my-7 p-0 text-lg font-medium text-black">
              Hi {partner.name}!
            </Heading>

            <Text className="text-sm leading-6 text-neutral-600">
              You've been moved to a new partner group in{" "}
              <strong>{program.name}'s</strong> partner program. Your rewards
              and benefits have been updated.
            </Text>

            {Boolean(rewards?.length || bounties?.length) && (
              <Section className="my-4 rounded-xl border border-solid border-neutral-200 bg-neutral-50 px-5 py-4">
                {rewards && Boolean(rewards.length) && (
                  <>
                    <Text className="my-0 text-base font-semibold text-black">
                      Your New Rewards
                    </Text>
                    {rewards.map((reward) => (
                      <Row key={reward.label} className="mb-0 mt-2">
                        <Column className="align-center">
                          <Img src={reward.icon} height="16" alt="" />
                        </Column>
                        <Column className="w-full pl-2">
                          <Text className="my-0 text-sm font-medium text-neutral-600">
                            {reward.label}
                          </Text>
                        </Column>
                      </Row>
                    ))}
                  </>
                )}

                {bounties && Boolean(bounties.length) && (
                  <>
                    <Text
                      className={`mb-0 text-base font-semibold text-black ${rewards?.length ? "mt-5" : "mt-0"}`}
                    >
                      Eligible Bounties
                    </Text>
                    {bounties.map((bounty) => (
                      <Row key={bounty.label} className="mb-0 mt-2">
                        <Column className="align-center">
                          <Img src={bounty.icon} height="16" alt="" />
                        </Column>
                        <Column className="w-full pl-2">
                          <Text className="my-0 text-sm font-medium text-neutral-600">
                            {bounty.label}
                          </Text>
                        </Column>
                      </Row>
                    ))}
                  </>
                )}
              </Section>
            )}

            <Hr className="my-6 border-neutral-200" />

            <Section className="mb-8 mt-8">
              <Link
                className="rounded-lg bg-neutral-900 px-6 py-3 text-[13px] font-semibold text-white no-underline"
                href={`https://partners.dub.co/programs/${program.slug}`}
              >
                Go to your dashboard
              </Link>
            </Section>

            <Text className="text-sm leading-6 text-neutral-600">
              If you have any questions about your new group or rewards, please{" "}
              <Link
                href={`https://partners.dub.co/messages/${program.slug}`}
                className="font-semibold text-neutral-700 underline underline-offset-2"
              >
                reach out to the {program.name} team ↗
              </Link>
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
