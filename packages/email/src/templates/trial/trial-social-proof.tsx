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
import { Footer } from "../../components/footer";
import { type TrialMarketingEmailProps } from "../../types/trial-marketing-email";

const FRAMER_CASE_IMAGE =
  "https://assets.dub.co/cms/trial-email-framer-thumbnail.png";
const RAYCAST_CASE_IMAGE =
  "https://assets.dub.co/cms/trial-email-raycast-thumbnail.png";

export default function TrialSocialProofEmail({
  email = "panic@thedis.co",
  unsubscribeUrl,
  plan: _plan,
  workspaceSlug,
}: TrialMarketingEmailProps) {
  const dashboardUrl = `https://app.dub.co/${workspaceSlug}`;
  const upgradeUrl = `${dashboardUrl}/settings/billing/upgrade`;

  return (
    <Html>
      <Head />
      <Preview>
        Stories from teams scaling links and partner programs with Dub.
      </Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>

            <Heading className="mx-0 my-7 p-0 text-xl font-semibold text-black">
              Meet our customers
            </Heading>

            <Text className="mb-8 text-sm leading-6 text-neutral-600">
              Dub gives superpowers to marketing teams at thousands of
              world-class companies – from startups to enterprises. Here are
              just a few of their stories.
            </Text>

            {/* Framer */}
            <Section className="mb-10">
              <Img
                src={FRAMER_CASE_IMAGE}
                alt="Framer and Dub"
                width={520}
                className="mb-4 w-full max-w-[520px] rounded-xl border border-solid border-neutral-200"
              />
              <Heading className="mx-0 mb-2 p-0 text-base font-semibold leading-snug text-black">
                How Framer manages $500K+ in monthly affiliate payouts with Dub
              </Heading>
              <Text className="mb-4 text-sm leading-6 text-neutral-600">
                Learn how Framer uses Dub to manage 7,000+ active partners and
                process $900K/mo in payouts via a fully white-labeled, headless
                partner program setup.
              </Text>
              <Link
                href="https://dub.co/customers/framer"
                className="inline-block rounded-lg border border-solid border-neutral-200 bg-white px-3 py-2 text-center text-sm font-medium text-black no-underline"
              >
                Read more
              </Link>
            </Section>

            {/* Raycast */}
            <Section className="mb-10">
              <Img
                src={RAYCAST_CASE_IMAGE}
                alt="Raycast and Dub"
                width={520}
                className="mb-4 w-full max-w-[520px] rounded-xl border border-solid border-neutral-200"
              />
              <Heading className="mx-0 mb-2 p-0 text-base font-semibold leading-snug text-black">
                How Raycast creates thousands of links per month with Dub
              </Heading>
              <Text className="mb-4 text-sm leading-6 text-neutral-600">
                Learn how Raycast leveraged Dub&apos;s link infrastructure to
                create thousands of links per month for their code screenshot
                tool – Ray.so.
              </Text>
              <Link
                href="https://dub.co/customers/raycast"
                className="inline-block rounded-lg border border-solid border-neutral-200 bg-white px-3 py-2 text-center text-sm font-medium text-black no-underline"
              >
                Read more
              </Link>
            </Section>

            <Text className="mb-8 text-sm leading-6 text-neutral-600">
              Be our next success story, and experience how Dub can scale with
              your growth and{" "}
              <Link
                href={upgradeUrl}
                className="text-neutral-600 underline underline-offset-2"
              >
                select a plan
              </Link>{" "}
              at any time during your trial to start a subscription.
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
