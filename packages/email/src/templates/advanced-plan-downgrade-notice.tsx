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
      <Preview>
        Removed features: Email campaigns, messaging center, advanced reward
        conditions, fraud detection, embedded referral dashboard
      </Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>
            <Heading className="mx-0 my-7 p-0 text-xl font-medium text-black">
              Advanced plan features have been removed
            </Heading>
            <Text className="text-sm leading-6 text-black">
              Your workspace <strong>{workspace.name}</strong> is no longer on
              the Advanced plan. We have applied the following changes to match
              your current subscription:
            </Text>
            <Text className="text-sm leading-6 text-black">
              •{" "}
              <Link
                href="https://dub.co/help/article/email-campaigns"
                className="font-medium text-black underline underline-offset-2"
              >
                Email campaigns
              </Link>{" "}
              have been paused or canceled.
            </Text>
            <Text className="text-sm leading-6 text-black">
              •{" "}
              <Link
                href="https://dub.co/help/article/messaging-partners"
                className="font-medium text-black underline underline-offset-2"
              >
                Messaging center
              </Link>{" "}
              has been disabled.
            </Text>
            <Text className="text-sm leading-6 text-black">
              •{" "}
              <Link
                href="https://dub.co/help/article/partner-rewards"
                className="font-medium text-black underline underline-offset-2"
              >
                Advanced reward conditions
              </Link>{" "}
              have been removed.
            </Text>
            <Text className="text-sm leading-6 text-black">
              •{" "}
              <Link
                href="https://dub.co/help/article/fraud-detection"
                className="font-medium text-black underline underline-offset-2"
              >
                Fraud events
              </Link>{" "}
              are still being tracked, but you need to upgrade to view them.
            </Text>
            <Text className="text-sm leading-6 text-black">
              • If you've set up the{" "}
              <Link
                href="https://dub.co/docs/partners/embedded-referrals"
                className="font-medium text-black underline underline-offset-2"
              >
                Embedded Referral Dashboard
              </Link>
              , it will no longer work.
            </Text>
            <Text className="text-sm leading-6 text-black">
              To reactivate these features, please upgrade to the Advanced plan.
            </Text>
            <Section className="mb-8 mt-8">
              <Link
                className="rounded-lg bg-black px-6 py-3 text-center text-[12px] font-semibold text-white no-underline"
                href={`https://app.dub.co/${workspace.slug}/settings/billing/upgrade?plan=advanced`}
              >
                Upgrade to Advanced
              </Link>
            </Section>
            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
