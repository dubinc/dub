import { DUB_WORDMARK } from "@dub/utils";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import { Footer } from "../components/footer";

const topPrograms = [
  {
    name: "Framer",
    slug: "framer",
  },
  {
    name: "SuperHuman",
    slug: "superhuman",
  },
  {
    name: "Tella",
    slug: "tella",
  },
  {
    name: "Testimonial",
    slug: "testimonial",
  },
  {
    name: "Firecrawl",
    slug: "firecrawl",
  },
  {
    name: "Rabbitholes AI",
    slug: "rabbitholes",
  },
  {
    name: "Cal.com",
    slug: "cal",
  },
  {
    name: "Wispr Flow",
    slug: "wispr",
  },
  {
    name: "Carry",
    slug: "carry",
  },
];

const DUB_PARTNERS_URL = "https://partners.dub.co";

export function PartnerWelcome({
  email = "panic@thedis.co",
  partner = {
    name: "John Doe",
  },
}: {
  email: string;
  partner: {
    name: string;
  };
}) {
  const topProgramsLinks = topPrograms.map((program, index) => (
    <>
      <Link
        href={`${DUB_PARTNERS_URL}/programs/${program.slug}`}
        className="font-semibold text-neutral-800 underline underline-offset-2"
      >
        {program.name}
      </Link>
      {index < topPrograms.length - 1 ? ", " : ""}
    </>
  ));

  return (
    <Html>
      <Head />
      <Preview>You're officially a Dub Partner</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] px-10 py-5">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>

            <Heading className="mx-0 my-6 p-0 text-lg font-medium text-black">
              Welcome {partner.name}!
            </Heading>

            <Text className="text-sm leading-5 text-neutral-600">
              You're officially a Dub Partner—time to start earning rewards and
              and turning referrals into rewards.
            </Text>

            <Hr className="my-6 border-b border-neutral-200" />

            <Heading
              className="mb-6 text-base font-semibold leading-6 text-neutral-900"
              as="h3"
            >
              Getting started
            </Heading>

            <Text className="mb-4 text-sm leading-5 text-neutral-800">
              1. <span className="font-medium">Join a program</span> - If you
              haven't already, check out top Dub Partner programs link{" "}
              {topProgramsLinks}, and yes{" "}
              <Link
                href={`${DUB_PARTNERS_URL}/programs/dub`}
                className="font-semibold text-neutral-800 underline underline-offset-2"
              >
                Dub
              </Link>{" "}
              too!
            </Text>

            <Text className="mb-4 text-sm leading-5 text-neutral-800">
              2. <span className="font-medium">Create referral links</span> -
              Once you’ve joined a program, you can start sharing and creating
              additional referral links.
            </Text>

            <Text className="mb-4 text-sm leading-5 text-neutral-800">
              3. <span className="font-medium">Track your performance</span> -
              Monitor traffic and earnings with built-in{" "}
              <Link
                href={`${DUB_PARTNERS_URL}`}
                className="font-semibold text-neutral-800 underline underline-offset-2"
              >
                analytics
              </Link>
              .
            </Text>

            <Text className="mb-4 text-sm leading-5 text-neutral-800">
              4. <span className="font-medium">Set up payouts</span> -{" "}
              <Link
                href={`${DUB_PARTNERS_URL}/settings/payouts`}
                className="font-semibold text-neutral-800 underline underline-offset-2"
              >
                Connect a payout method
              </Link>{" "}
              to get paid via PayPal or bank account (powered by Stripe).
            </Text>

            <Section className="my-10">
              <Link
                href={DUB_PARTNERS_URL}
                className="box-border h-10 w-fit rounded-lg bg-black px-4 py-3 text-center text-sm leading-none text-white no-underline"
              >
                Go to your dashboard
              </Link>
            </Section>

            <Footer email={email} marketing />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export default PartnerWelcome;
