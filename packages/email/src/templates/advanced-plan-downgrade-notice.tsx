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

export default function AdvancedPlanDowngradeNotice({
  email = "you@example.com",
  workspace = {
    name: "Acme",
    slug: "acme",
  },
}: {
  email: string;
  workspace: {
    name: string;
    slug: string;
  };
}) {
  return (
    <Html>
      <Head />
      <Preview>Your workspace is no longer on the Advanced plan</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>
            <Heading className="mx-0 my-7 p-0 text-xl font-medium text-black">
              Advanced-only features have been updated
            </Heading>
            <Text className="text-sm leading-6 text-black">
              Your workspace <strong>{workspace.name}</strong> is no longer on
              the Advanced plan. We have applied the following changes to match
              your current subscription:
            </Text>
            <Text className="text-sm leading-6 text-black">
              • Advanced reward conditions (modifiers) on your program rewards
              have been cleared.
            </Text>
            <Text className="text-sm leading-6 text-black">
              • Email campaigns that required Advanced (scheduled marketing
              sends and active transactional campaigns) have been paused or
              canceled.
            </Text>
            <Text className="text-sm leading-6 text-black">
              Partner messaging and other plan limits now follow your new plan.
              You can review rewards and campaigns in Dub anytime.
            </Text>
            <Section className="mb-8 mt-8">
              <Link
                className="rounded-lg bg-black px-6 py-3 text-center text-[12px] font-semibold text-white no-underline"
                href={`https://app.dub.co/${workspace.slug}`}
              >
                Open workspace
              </Link>
            </Section>
            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
