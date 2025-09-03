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

export default function BountyCompleted({
  bounty = {
    name: "Promote Acme at your campus and earn $500 ",
    type: "submission",
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
      <Preview>Bounty completed</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-8 max-w-[600px] px-8 py-8">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>

            <Heading className="mx-0 my-8 p-0 text-lg font-medium text-black">
              Bounty completed for <strong>{program.name}</strong>
            </Heading>

            <Text className="text-sm leading-5 text-neutral-600">
              Congratulations on completing the <strong>{bounty.name}</strong>{" "}
              bounty for <strong>{program.name}</strong>!
            </Text>

            <Section className="h-[140px] rounded-lg bg-neutral-100 py-1.5 text-center">
              <BountyThumbnailImage type={bounty.type} />
            </Section>

            {bounty.type === "submission" ? (
              <Text className="text-sm leading-5 text-neutral-600">
                Once <strong>{program.name}</strong> has confirmed your bounty,
                you will receive an email with the commission details.
              </Text>
            ) : (
              <Text className="text-sm leading-5 text-neutral-600">
                The commission from the bounty has been added to your upcoming
                payout, and will be sent to your bank account when{" "}
                <strong>{program.name}</strong> processes their next payout.
              </Text>
            )}

            <Text className="text-sm leading-5 text-neutral-600">
              If you have any questions, please don't hesitate to reach out to
              the <strong>{program.name}</strong> team{" "}
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
