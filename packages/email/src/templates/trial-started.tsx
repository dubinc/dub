import {
  capitalize,
  DUB_WORDMARK,
  PARTNER_CHECKOUT_TRIAL_PERIOD_DAYS,
} from "@dub/utils";
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

export default function TrialStartedEmail({
  email = "panic@thedis.co",
  unsubscribeUrl,
  plan,
  workspaceSlug,
}: TrialMarketingEmailProps) {
  const trialDays = PARTNER_CHECKOUT_TRIAL_PERIOD_DAYS;
  const planLabel = capitalize(plan);
  const dashboardUrl = `https://app.dub.co/${workspaceSlug}`;

  return (
    <Html>
      <Head />
      <Preview>
        {trialDays} days of Dub — domains, tracking, partners, and API. Here
        are your first steps.
      </Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>
            <Heading className="mx-0 my-7 p-0 text-xl font-semibold text-black">
              Welcome to your free {trialDays}-day trial of Dub!
            </Heading>
            <Text className="mb-6 text-sm leading-6 text-neutral-600">
              You&apos;re now on a {trialDays}-day trial of {planLabel}. Explore
              how Dub connects links, partners, and revenue in one system.
            </Text>

            <Heading className="mx-0 mb-3 mt-2 p-0 text-base font-semibold text-black">
              Here&apos;s where to start:
            </Heading>

            <Text className="mb-4 text-sm leading-6 text-neutral-600">
              1. Set up your domain —{" "}
              <Link
                href="https://dub.co/help/article/how-to-add-custom-domain"
                className="text-neutral-600 underline underline-offset-2"
              >
                Add a custom domain
              </Link>{" "}
              and start creating your branded short links.
            </Text>

            <Text className="mb-4 text-sm leading-6 text-neutral-600">
              2. Track conversions:{" "}
              <Link
                href={`${dashboardUrl}/settings/tracking`}
                className="text-neutral-600 underline underline-offset-2"
              >
                Install the Dub tracking script
              </Link>{" "}
              to track your short link and partner conversions.
            </Text>

            <Text className="mb-4 text-sm leading-6 text-neutral-600">
              3. Create a program:{" "}
              <Link
                href="https://dub.co/docs/partners/quickstart"
                className="text-neutral-600 underline underline-offset-2"
              >
                Set up your Dub partner program
              </Link>{" "}
              to grow your revenue on autopilot with advanced reward structures,
              dual-sided incentives, and real-time attribution.
            </Text>

            <Text className="mb-6 text-sm leading-6 text-neutral-600">
              4. Explore the API -{" "}
              <Link
                href="https://dub.co/docs"
                className="text-neutral-600 underline underline-offset-2"
              >
                Check out our docs
              </Link>{" "}
              to automate link creation and integrate with your stack.
            </Text>

            <Text className="mb-8 text-sm leading-6 text-neutral-600">
              You&apos;ll have access to all features during your trial, with
              usage limits in place. When the trial ends, your workspace will
              move to a paid plan unless changed.
            </Text>

            <Section className="my-8">
              <Link
                className="rounded-lg bg-black px-4 py-2.5 text-center text-[14px] font-medium text-white no-underline"
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
