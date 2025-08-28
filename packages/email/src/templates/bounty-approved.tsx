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
import { BountyThumbnailImage } from "../components/bounty-thumbnail";
import { Footer } from "../components/footer";

export default function BountyApproved({
  program = {
    name: "Acme",
    slug: "acme",
    supportEmail: "support@example.com",
  },
  bounty = {
    name: "Promote Acme at your campus and earn $500 ",
    type: "performance",
  },
  email = "panic@thedis.co",
}: {
  program: {
    slug: string;
    name: string;
    supportEmail: string;
  };
  bounty: {
    name: string;
    type: "performance" | "submission";
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
              Bounty confirmed for <strong>{program.name}</strong>
            </Heading>

            <Text className="text-sm leading-5 text-neutral-600">
              Good news: Your bounty submission for{" "}
              <strong>{bounty.name}</strong> has been confirmed.
            </Text>

            <Section className="h-[140px] rounded-lg bg-neutral-100 py-1.5 text-center">
              <BountyThumbnailImage type={bounty.type} />
            </Section>

            <Text className="text-sm leading-5 text-neutral-600">
              The commission from the bounty has been added to your upcoming
              payout, and will be sent to your bank account when{" "}
              <strong>{program.name}</strong> processes their next payout.
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
