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
import { type TrialMarketingEmailProps } from "../components/trial-email-shell";

export default function Trial3DaysRemainingEmail({
  email = "panic@thedis.co",
  unsubscribeUrl,
  plan: _plan,
  workspaceSlug,
}: TrialMarketingEmailProps) {
  const dashboardUrl = `https://app.dub.co/${workspaceSlug}`;
  const upgradeUrl = `${dashboardUrl}/settings/billing/upgrade`;
  const billingUrl = `${dashboardUrl}/settings/billing`;

  return (
    <Html>
      <Head />
      <Preview>
        Keep links, partners, and revenue running — choose a plan that fits
        your team.
      </Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>

            <Heading className="mx-0 my-7 p-0 text-xl font-semibold text-black">
              You have 3 days left in your Dub trial
            </Heading>

            <Text className="mb-8 text-sm leading-6 text-neutral-600">
              By now, you&apos;ve seen how links, partners, and revenue work
              together on Dub.{" "}
              <Link
                href={upgradeUrl}
                className="text-neutral-600 underline underline-offset-2"
              >
                Choose a plan
              </Link>{" "}
              that fits your team and keep everything running as is.
            </Text>

            <Text className="mb-3 text-sm font-semibold leading-6 text-neutral-800">
              What that means for you:
            </Text>

            <Text className="mb-3 text-sm leading-6 text-neutral-600">
              • Every link is branded and trackable
            </Text>
            <Text className="mb-3 text-sm leading-6 text-neutral-600">
              • Every click ties back to real outcomes
            </Text>
            <Text className="mb-8 text-sm leading-6 text-neutral-600">
              • Every partner becomes a channel for growth
            </Text>

            <Text className="mb-8 text-sm leading-6 text-neutral-600">
              When your trial ends, your workspace will{" "}
              <Link
                href={billingUrl}
                className="text-neutral-600 underline underline-offset-2"
              >
                continue on the current plan
              </Link>{" "}
              so everything stays live without interruption.
            </Text>

            <Section className="mb-8">
              <Link
                className="block w-fit rounded-lg bg-black px-4 py-2.5 text-center text-[14px] font-medium text-white no-underline"
                href={dashboardUrl}
              >
                Go to your dashboard
              </Link>
            </Section>

            <Footer email={email} marketing unsubscribeUrl={unsubscribeUrl} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
