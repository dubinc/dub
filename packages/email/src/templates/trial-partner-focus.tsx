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
  Row,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import { Footer } from "../components/footer";
import { type TrialMarketingEmailProps } from "../types/trial-marketing-email";

export default function TrialPartnerFocusEmail({
  email = "panic@thedis.co",
  unsubscribeUrl,
  plan: _plan,
  workspaceSlug,
}: TrialMarketingEmailProps) {
  const dashboardUrl = `https://app.dub.co/${workspaceSlug}`;
  const programUrl = `${dashboardUrl}/program`;
  const upgradeUrl = `${dashboardUrl}/settings/billing/upgrade`;
  const trackingUrl = `${dashboardUrl}/settings/tracking`;

  return (
    <Html>
      <Head />
      <Preview>
        Tracking, programs, landing pages, and incentives for partners.
      </Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>

            <Heading className="mx-0 my-7 p-0 text-xl font-semibold text-black">
              Turn partners into a growth channel
            </Heading>

            <Text className="mb-6 text-sm leading-6 text-neutral-600">
              With Dub, you can create a modern affiliate program for partnering
              with affiliates, influencers, and your users.
            </Text>

            <Heading className="mx-0 mb-3 mt-2 p-0 text-base font-semibold text-black">
              Start here:
            </Heading>

            <Text className="mb-4 text-sm leading-6 text-neutral-600">
              1. Track conversions:{" "}
              <Link
                href={trackingUrl}
                className="text-neutral-600 underline underline-offset-2"
              >
                Install the Dub tracking script
              </Link>{" "}
              to track your partner conversions with accurate attribution.
            </Text>

            <Text className="mb-4 text-sm leading-6 text-neutral-600">
              2. Create a program:{" "}
              <Link
                href="https://dub.co/docs/partners/quickstart"
                className="text-neutral-600 underline underline-offset-2"
              >
                Set up your Dub partner program
              </Link>{" "}
              to grow your revenue on autopilot with advanced reward structures
              and more.
            </Text>

            <Text className="mb-4 text-sm leading-6 text-neutral-600">
              3. Open applications:{" "}
              <Link
                href="https://dub.co/help/article/program-landing-page"
                className="text-neutral-600 underline underline-offset-2"
              >
                Create your program landing page
              </Link>
              , and share it online with the partners you want to apply.
            </Text>

            <Text className="mb-6 text-sm leading-6 text-neutral-600">
              4. Incentivize partners:{" "}
              <Link
                href="https://dub.co/help/article/dual-sided-incentives"
                className="text-neutral-600 underline underline-offset-2"
              >
                Create dual-sided incentives
              </Link>{" "}
              to give new customers who sign up via a referral link special
              discounts.
            </Text>

            <Text className="mb-8 text-sm leading-6 text-neutral-600">
              Take your affiliate program to the next level with Dub, and you
              can{" "}
              <Link
                href={upgradeUrl}
                className="text-neutral-600 underline underline-offset-2"
              >
                select a plan
              </Link>{" "}
              at any time during your trial to start a subscription.
            </Text>

            <Section className="mb-8">
              <Row>
                <Link
                  className="mr-2 inline w-fit rounded-lg bg-black px-4 py-2.5 text-center text-[14px] font-medium text-white no-underline"
                  href={programUrl}
                >
                  View your program
                </Link>

                <Link
                  className="inline w-fit rounded-lg border border-solid border-neutral-200 bg-white px-4 py-2.5 text-center text-[14px] font-medium text-black no-underline"
                  href="https://dub.co/help/article/dub-partners"
                >
                  Learn more about programs
                </Link>
              </Row>
            </Section>

            <Footer email={email} marketing unsubscribeUrl={unsubscribeUrl} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
