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

export default function BountySubmitted({
  program = {
    name: "Acme",
    slug: "acme",
    supportEmail: "support@example.com",
  },
  bounty = {
    name: "Promote Acme at your campus and earn $500",
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
  };
  email: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>Bounty submitted</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-8 max-w-[600px] px-8 py-8">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>

            <Heading className="mx-0 my-8 p-0 text-lg font-medium text-black">
              Bounty submitted!
            </Heading>

            <Text className="text-sm leading-5 text-neutral-600">
              Thanks for submitting proof for the <strong>{bounty.name}</strong>{" "}
              bounty!
            </Text>

            <Section className="h-[140px] rounded-lg bg-neutral-100 py-1.5 text-center">
              <BountyThumbnailImage type="submission" />
            </Section>

            <Text className="text-sm leading-5 text-neutral-600">
              Once <strong>{program.name}</strong> has verified the submitted
              proof, the reward will be added to your payouts.
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
                href={`https://partners.dub.co/programs/${program.slug}`}
              >
                Go to your dashboard
              </Link>
            </Section>

            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
