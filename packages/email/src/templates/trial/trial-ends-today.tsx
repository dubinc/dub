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

export default function TrialEndsTodayEmail({
  email = "panic@thedis.co",
  unsubscribeUrl,
  plan,
  workspaceSlug,
}: TrialMarketingEmailProps) {
  const dashboardUrl = `https://app.dub.co/${workspaceSlug}`;
  const billingUrl = `${dashboardUrl}/settings/billing`;
  const planName = capitalize(plan);

  return (
    <Html>
      <Head />
      <Preview>
        Your links, partner program, and workflows stay live on your plan.
      </Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>

            <Heading className="mx-0 my-7 p-0 text-xl font-semibold text-black">
              Your Dub trial ends today
            </Heading>

            <Text className="mb-6 text-sm leading-6 text-neutral-600">
              You&apos;ve had full access to everything, from branded links to
              partner programs to revenue tracking.
            </Text>

            <Text className="mb-8 text-sm leading-6 text-neutral-600">
              To keep everything running, your workspace{" "}
              <Link
                href={billingUrl}
                className="text-neutral-600 underline underline-offset-2"
              >
                will continue on the {planName} plan
              </Link>
              .
            </Text>

            <Text className="mb-3 text-sm font-semibold leading-6 text-neutral-800">
              What stays in place:
            </Text>

            <Text className="mb-0 mt-0 text-sm leading-6 text-neutral-600">
              • Your links, data, and tracking stay live
            </Text>
            <Text className="mb-0 mt-0 text-sm leading-6 text-neutral-600">
              • Your partner program keeps driving growth
            </Text>
            <Text className="mb-8 mt-0 text-sm leading-6 text-neutral-600">
              • Your workflows continue without interruption
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
