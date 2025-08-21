import { DUB_WORDMARK } from "@dub/utils";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import { BountyThumbnailImage } from "src/components/bounty-thumbnail";
import { Footer } from "../components/footer";

export default function BountyApproved({
  bounty = {
    name: "Promote Acme at your campus and earn $500 ",
    type: "performance",
  },
  program = {
    name: "Acme",
    slug: "acme",
    supportEmail: "support@example.com",
  },
  email = "panic@thedis.co",
}: {
  bounty: {
    name: string;
    type: "performance" | "submission";
  };
  program: {
    slug: string;
    name: string;
    supportEmail: string;
  };
  email: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>Bounty confirmed</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-8 max-w-[600px] px-8 py-8">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>

            <Heading className="mx-0 my-8 p-0 text-lg font-medium text-black">
              Bounty confirmed!
            </Heading>

            <Text className="text-sm leading-5 text-neutral-600">
              The bounty for <strong>{bounty.name}</strong> has been confirmed,
              and the reward is on it’s way!
            </Text>

            <Section className="flex h-[140px] items-center justify-center rounded-lg bg-neutral-100 py-1.5">
              <BountyThumbnailImage type={bounty.type} />
            </Section>

            <Text className="text-sm leading-5 text-neutral-600">
              The reward has been sent to your payouts, ready for Acme to
              complete on their next payout day.
            </Text>

            <Text className="text-sm leading-5 text-neutral-600">
              If you have any questions about the program please don’t hesitate
              to reach out to the <strong>{program.name}</strong> team{" "}
              <span className="font-semibold text-blue-600">
                ({program.supportEmail})
              </span>
            </Text>

            <Section className="mb-10 mt-6">
              <Link
                className="rounded-lg bg-neutral-900 px-6 py-3 text-[13px] font-medium text-white no-underline"
                href={`https://partners.dub.co/payouts`}
              >
                Go to your payouts
              </Link>
            </Section>

            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
