import { DUB_WORDMARK } from "@dub/utils";
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

export default function ProgramInvite({
  email = "panic@thedis.co",
  name = "John Doe",
  program = {
    name: "Acme",
    slug: "acme",
    logo: DUB_WORDMARK,
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
  email: string;
  name: string | null;
  program: {
    name: string;
    slug: string;
    logo: string | null;
  };
  rewards: { icon: string; label: string }[] | null;
  bounties: { icon: string; label: string }[] | null;
}) {
  return (
    <Html>
      <Head />
      <Preview>Sign up for {program.name}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-8 max-w-[600px] px-8 py-8">
            <Section className="mb-8 mt-6">
              <Img
                src={program.logo || "https://assets.dub.co/logo.png"}
                height="32"
                alt={program.name}
              />
            </Section>

            <Heading className="bt-5 mx-0 mt-10 p-0 text-lg font-medium text-black">
              You've been invited
            </Heading>

            <Text className="text-sm leading-6 text-neutral-600">
              {name && !name.includes("@") && <>Hi {name}, </>}
              {program.name} invited you to join their program on Dub Partners.
            </Text>

            <Text className="text-sm leading-6 text-neutral-600">
              {program.name} uses{" "}
              <Link
                href="https://dub.co/partners"
                target="_blank"
                className="font-semibold text-neutral-800 underline underline-offset-2"
              >
                Dub Partners
              </Link>{" "}
              to power their partner program and wants to work with great people
              like you!
            </Text>

            <Section className="my-8">
              <Link
                className="rounded-lg bg-neutral-900 px-4 py-3 text-[12px] font-semibold text-white no-underline"
                href={`https://partners.dub.co/${program.slug}/register?email=${encodeURIComponent(email)}&next=/programs/${program.slug}`}
              >
                Accept Invite
              </Link>
            </Section>

            {Boolean(rewards?.length || bounties?.length) && (
              <>
                <Text className="text-sm leading-6 text-neutral-600">
                  If you accept the invite, you're immediately eligible for the
                  following:
                </Text>
                <Section className="rounded-xl border border-solid border-neutral-200 bg-neutral-50 px-5 py-4">
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

            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
