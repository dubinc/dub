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
import { Footer } from "../components/footer";

export default function BountyRejected({
  program = {
    name: "Acme",
    slug: "acme",
    supportEmail: "support@example.com",
  },
  bounty = {
    name: "Promote Acme at your campus and earn $500 ",
  },
  submission = {
    rejectionReason: "Not a valid URL",
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
  submission: {
    rejectionReason: string;
  };
  email: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>Bounty rejected</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-8 max-w-[600px] px-8 py-8">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>

            <Heading className="mx-0 my-8 p-0 text-lg font-medium text-black">
              Bounty rejected
            </Heading>

            <Text className="text-sm leading-5 text-neutral-600">
              The proof you’ve submitted for the <strong>{bounty.name}</strong>{" "}
              bounty has been rejected for the reason:
            </Text>

            <Section className="flex h-[52px] items-center rounded-lg border border-solid border-neutral-200 bg-neutral-100 p-4">
              <span className="text-sm font-normal">
                {submission.rejectionReason}
              </span>
            </Section>

            <Text className="text-sm leading-5 text-neutral-600">
              You won’t be able to submit proof again for this bounty.
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
