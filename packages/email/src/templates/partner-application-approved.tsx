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

export default function PartnerApplicationApproved({
  program = {
    name: "Acme",
    logo: DUB_WORDMARK,
    slug: "acme",
  },
  partner = {
    name: "John Doe",
    email: "panic@thedis.co",
    payoutsEnabled: false,
  },
  rewards = null,
  bounties = null,
}: {
  program: {
    name: string;
    logo: string | null;
    slug: string;
  };
  partner: {
    name: string;
    email: string;
    payoutsEnabled: boolean;
  };
  rewards?: { icon: string; label: string }[] | null;
  bounties?: { icon: string; label: string }[] | null;
}) {
  return (
    <Html>
      <Head />
      <Preview>
        Your application to join {program.name}'s partner program has been
        approved!
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
              Congratulations, {partner.name}!
            </Heading>

            <Text className="text-sm leading-6 text-neutral-600">
              Your application to join <strong>{program.name}'s</strong> partner
              program has been approved. You can now start promoting their
              products and earning commissions.
            </Text>

            {Boolean(rewards?.length || bounties?.length) && (
              <>
                <Text className="text-sm leading-6 text-neutral-600">
                  You're immediately eligible for the following:
                </Text>
                <Section className="my-4 rounded-xl border border-solid border-neutral-200 bg-neutral-50 px-5 py-4">
                  {rewards && Boolean(rewards.length) && (
                    <>
                      <Text className="my-0 text-base font-semibold text-black">
                        Rewards
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
                        Bounties
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
              </>
            )}

            <Hr className="my-6 border-neutral-200" />

            <Heading className="mx-0 mb-2 p-0 text-base font-medium text-black">
              Getting Started
            </Heading>

            <Text className="ml-1 text-sm leading-5 text-black">
              1. Find your unique referral links in the{" "}
              <Link
                href={`https://partners.dub.co/programs/${program.slug}/links`}
                className="font-semibold text-black underline"
              >
                Links
              </Link>{" "}
              section.
            </Text>

            <Text className="ml-1 text-sm leading-5 text-black">
              2. Share your referral links on your website, blog, social media,
              or email newsletters.
            </Text>

            <Text className="ml-1 text-sm leading-5 text-black">
              3. Track your{" "}
              <Link
                href={`https://partners.dub.co/programs/${program.slug}`}
                className="font-semibold text-black underline"
              >
                link performance
              </Link>{" "}
              and{" "}
              <Link
                href={`https://partners.dub.co/programs/${program.slug}/earnings`}
                className="font-semibold text-black underline"
              >
                earnings
              </Link>{" "}
              in real-time.
            </Text>

            <Text className="ml-1 text-sm leading-5 text-black">
              4. Learn how to{" "}
              <Link
                href="https://dub.co/help/article/navigating-partner-program"
                className="font-semibold text-black underline"
              >
                navigate the program dashboard
              </Link>{" "}
              and get the most out of your program.
            </Text>

            {!partner.payoutsEnabled && (
              <Text className="ml-1 text-sm leading-5 text-black">
                5. Connect your Stripe account to{" "}
                <Link
                  href="https://dub.co/help/article/receiving-payouts"
                  className="font-semibold text-black underline"
                >
                  enable payouts
                </Link>
                .
              </Text>
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
              If you have any questions about the program please don't hesitate
              to{" "}
              <Link
                href={`https://partners.dub.co/messages/${program.slug}`}
                className="font-semibold text-neutral-700 underline underline-offset-2"
              >
                reach out to the {program.name} team ↗
              </Link>
              .
            </Text>

            <Text className="text-sm leading-6 text-neutral-600">
              We're excited to have you as a partner and look forward to your
              success!
            </Text>

            <Footer
              email={partner.email}
              notificationSettingsUrl="https://partners.dub.co/settings/notifications"
            />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
