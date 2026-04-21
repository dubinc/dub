import { capitalize, DUB_WORDMARK } from "@dub/utils";
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
import { Footer } from "../../components/footer";
import { type TrialMarketingEmailProps } from "../../types/trial-marketing-email";

export default function Trial7DaysRemainingEmail({
  email = "panic@thedis.co",
  plan,
  workspaceSlug = "acme",
}: TrialMarketingEmailProps) {
  const dashboardUrl = `https://app.dub.co/${workspaceSlug}`;
  const upgradeUrl = `${dashboardUrl}/settings/billing/upgrade`;
  const webhooksUrl = `${dashboardUrl}/settings/webhooks`;
  const planName = capitalize(plan);

  return (
    <Html>
      <Head />
      <Preview>
        Help center, docs, API, and webhooks — plus how your plan continues
        after trial.
      </Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>

            <Heading className="mx-0 my-7 p-0 text-xl font-semibold text-black">
              Your trial is ending soon
            </Heading>

            <Text className="mb-6 text-sm leading-6 text-neutral-600">
              It&apos;s been a week since you started your Dub trial, and we
              wanted to check in to see how things were going.
            </Text>

            <Text className="mb-8 text-sm leading-6 text-neutral-600">
              You&apos;re one week into your Dub trial, with 7 days of full
              access remaining. You can{" "}
              <Link
                href={upgradeUrl}
                className="text-neutral-600 underline underline-offset-2"
              >
                choose a plan at any time
              </Link>
              . When your trial ends, your workspace will continue on the{" "}
              <span className="text-neutral-800">{planName}</span> plan so
              everything stays live.
            </Text>

            <Text className="mb-4 text-sm leading-6 text-neutral-600">
              •{" "}
              <Link
                href="https://dub.co/help"
                className="text-neutral-600 underline underline-offset-2"
              >
                Browse our help center
              </Link>{" "}
              and get the answers you need with our extensive articles and
              documentation.
            </Text>

            <Text className="mb-4 text-sm leading-6 text-neutral-600">
              •{" "}
              <Link
                href="https://dub.co/docs"
                className="text-neutral-600 underline underline-offset-2"
              >
                Read the developer docs
              </Link>{" "}
              for a deeper understanding of how Dub works, and additional
              connection instructions.
            </Text>

            <Text className="mb-4 text-sm leading-6 text-neutral-600">
              •{" "}
              <Link
                href="https://dub.co/docs/api-reference/introduction"
                className="text-neutral-600 underline underline-offset-2"
              >
                Use the Dub API
              </Link>{" "}
              to programmatically manage resources in your Dub workspace.
            </Text>

            <Text className="mb-4 text-sm leading-6 text-neutral-600">
              •{" "}
              <Link
                href={webhooksUrl}
                className="text-neutral-600 underline underline-offset-2"
              >
                Use webhooks
              </Link>{" "}
              to get real-time notifications on events happening across your Dub
              workspace.
            </Text>

            <Text className="mb-8 text-sm leading-6 text-neutral-600">
              •{" "}
              <Link
                href="https://dub.co/contact/sales"
                className="text-neutral-600 underline underline-offset-2"
              >
                Contact us for larger enterprise needs
              </Link>
              . Speak with our sales team about a product demo, volume pricing,
              or custom integrations.
            </Text>

            <Section className="mb-8">
              <Link
                className="block rounded-lg bg-black px-4 py-2.5 text-center text-[14px] font-medium text-white no-underline"
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
