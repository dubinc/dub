import { DUB_WORDMARK, getPrettyUrl } from "@dub/utils";
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

export default function ProgramNetworkInvite({
  email = "panic@thedis.co",
  name = "John Doe",
  program = {
    name: "Acme",
    slug: "acme",
    logo: "https://assets.dub.co/misc/acme-logo.png",
    website: "https://acme.dub.sh",
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
    website?: string | null;
  };
  rewards: { icon: string; label: string }[] | null;
  bounties: { icon: string; label: string }[] | null;
}) {
  const programWebsite = program.website ?? null;

  return (
    <Html>
      <Head />
      <Preview>Sign up for {program.name}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-8 max-w-[600px] px-8 py-8">
            <Section className="mb-8 mt-6">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>

            <Heading className="mx-0 mt-10 p-0 text-lg font-medium text-black">
              You're getting noticed!
            </Heading>

            <Text className="text-sm leading-6 text-neutral-600">
              {name && !name.includes("@") && <>Hi {name}, </>}
              {program.name} found you on the Dub Partner Network and invited
              you to join their partner program.
            </Text>

            <>
              <Text className="text-sm leading-6 text-neutral-600">
                Here’s more details about the program and what you’ll be eligible to earn:
              </Text>
              <Section className="overflow-hidden rounded-xl border border-solid border-neutral-200 bg-white">
                <Section className="px-5 py-4">
                  <Row>
                    <Column className="w-[48px] align-top">
                      <Img
                        src={
                          program.logo || "https://assets.dub.co/misc/acme-logo.png"
                        }
                        width="40"
                        height="40"
                        alt={program.name}
                        className="rounded-full"
                      />
                    </Column>
                    <Column className="w-full pl-3">
                      <Text className="my-0 text-base font-semibold leading-5 text-black">
                        {program.name}
                      </Text>
                      {programWebsite && (
                        <Link
                          href={programWebsite}
                          className="mt-0 block text-xs font-medium leading-4 text-neutral-500 underline"
                        >
                          {getPrettyUrl(programWebsite)}
                        </Link>
                      )}
                    </Column>
                  </Row>
                </Section>
                <Section className="rounded-xl border-t border-solid border-neutral-200 bg-neutral-50 px-5 py-4">
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
                  <Link
                    className="mt-5 block rounded-lg bg-neutral-900 px-4 py-3 text-center text-[12px] font-semibold text-white no-underline"
                    href={`https://partners.dub.co/${program.slug}/register?email=${encodeURIComponent(email)}&next=/programs/${program.slug}`}
                  >
                    View invite
                  </Link>
                </Section>
              </Section>
            </>
            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
