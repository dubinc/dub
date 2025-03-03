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
import { ReactNode } from "react";
import { Footer } from "../components/footer";

export function PartnerApplicationApproved({
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
  rewardDescription = "Earn 30% for each sale and again every month for 12 months.",
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
  rewardDescription: ReactNode;
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
          <Container className="mx-auto my-10 max-w-[500px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="my-8">
              <Img
                src={program.logo || "https://assets.dub.co/logo.png"}
                height="32"
                alt={program.name}
              />
            </Section>

            <Heading className="mx-0 p-0 text-lg font-medium text-black">
              Congratulations, {partner.name}!
            </Heading>

            <Text className="text-sm leading-6 text-neutral-600">
              Your application to join <strong>{program.name}'s</strong> partner
              program has been approved. You can now start promoting their
              products and earning commissions.
            </Text>

            <Text className="text-sm leading-6 text-neutral-900">
              {rewardDescription}
            </Text>

            <Hr className="my-6 border-neutral-200" />

            <Heading className="mx-0 mb-2 p-0 text-base font-medium text-black">
              Getting Started
            </Heading>

            <Text className="ml-1 text-sm leading-5 text-black">
              1. Find your unique referral links in the{" "}
              <Link
                href={`https://partners.dub.co/programs/${program.slug}/links`}
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
              <Link href={`https://partners.dub.co/programs/${program.slug}`}>
                link performance
              </Link>{" "}
              and{" "}
              <Link
                href={`https://partners.dub.co/programs/${program.slug}/earnings`}
              >
                earnings
              </Link>{" "}
              in real-time.
            </Text>

            {!partner.payoutsEnabled && (
              <Text className="ml-1 text-sm leading-5 text-black">
                4. Connect your Stripe account to{" "}
                <Link href="https://partners.dub.co/settings/payouts">
                  enable payouts
                </Link>
                .
              </Text>
            )}

            <Hr className="my-6 border-neutral-200" />

            <Section className="mb-8 mt-8">
              <Link
                className="rounded-md bg-neutral-900 px-6 py-3 text-[13px] font-medium text-white no-underline"
                href={`https://partners.dub.co/programs/${program.slug}`}
              >
                Go to your dashboard
              </Link>
            </Section>

            <Text className="text-sm leading-6 text-neutral-600">
              If you have any questions about the program please don't hesitate
              to reach out to the <strong>{program.name}</strong> team.
            </Text>

            <Text className="text-sm leading-6 text-neutral-600">
              We're excited to have you as a partner and look forward to your
              success!
            </Text>

            <Footer email={partner.email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export default PartnerApplicationApproved;
