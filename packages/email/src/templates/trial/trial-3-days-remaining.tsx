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
import { Footer } from "../../components/footer";
import { type TrialMarketingEmailProps } from "../../types/trial-marketing-email";

export default function Trial3DaysRemainingEmail({
  email = "panic@thedis.co",
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
        Keep links, partners, and revenue running — choose a plan that fits your
        team.
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

            <Text className="mb-6 mt-5 text-sm leading-5 text-neutral-600">
              By now, you&apos;ve seen how links, partners, and revenue work
              together on Dub.
            </Text>

            <Heading className="mx-0 mb-6 p-0 text-base font-semibold text-black">
              What that means for you:
            </Heading>

            <Text className="mb-4 text-sm leading-5 text-neutral-800">
              1.{" "}
              <span className="font-semibold text-black">
                Every link is branded and trackable
              </span>
              : Short links on your domain, with full visibility into performance.
            </Text>

            <Text className="mb-4 text-sm leading-5 text-neutral-800">
              2.{" "}
              <span className="font-semibold text-black">
                Every click ties back to real outcomes
              </span>
              : Tie clicks to conversions so you can see what actually drives
              revenue.
            </Text>

            <Text className="mb-0 text-sm leading-5 text-neutral-800">
              3.{" "}
              <span className="font-semibold text-black">
                Every partner becomes a channel for growth
              </span>
              : Run programs that reward partners for the traffic and sales they
              generate.
            </Text>

            <Hr />

            <Text className="mb-8 text-sm leading-5 text-neutral-800">
              You can{" "}
              <Link
                href={upgradeUrl}
                className="font-medium text-neutral-500 underline underline-offset-2"
              >
                choose a plan
              </Link>{" "}
              that fits your team and keep everything running as is. When your
              trial ends, your workspace will{" "}
              <Link
                href={billingUrl}
                className="font-medium text-neutral-500 underline underline-offset-2"
              >
                continue on the current plan
              </Link>{" "}
              so everything stays live without interruption.
            </Text>

            <Section className="my-8">
              <Link
                className="rounded-lg bg-black px-4 py-2.5 text-center text-[14px] font-medium text-white no-underline"
                href={dashboardUrl}
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
