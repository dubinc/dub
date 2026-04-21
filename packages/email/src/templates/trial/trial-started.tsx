import {
  capitalize,
  DUB_LOGO,
  DUB_TRIAL_PERIOD_DAYS,
  DUB_WORDMARK,
  getPrettyUrl,
} from "@dub/utils";
import {
  Body,
  Column,
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
import { Footer } from "../../components/footer";
import { type TrialMarketingEmailProps } from "../../types/trial-marketing-email";

export default function TrialStartedEmail({
  email = "panic@thedis.co",
  plan = "Advanced",
  workspaceSlug = "acme",
  program,
}: TrialMarketingEmailProps & {
  program?: {
    slug: string;
    name: string;
    logo: string | null;
  };
}) {
  const planLabel = capitalize(plan);
  const dashboardUrl = `https://app.dub.co/${workspaceSlug}`;

  return (
    <Html>
      <Head />
      <Preview>
        {String(DUB_TRIAL_PERIOD_DAYS)} days of Dub — domains, tracking,
        partners, and API. Here are your first steps.
      </Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>
            <Heading className="mx-0 my-7 p-0 text-xl font-semibold text-black">
              Welcome to your free {String(DUB_TRIAL_PERIOD_DAYS)}-day trial of
              Dub!
            </Heading>

            {program && (
              <>
                <Text className="mb-6 mt-5 text-sm leading-5 text-neutral-600">
                  Your program{" "}
                  <span className="font-semibold text-neutral-800">
                    {program.name}
                  </span>{" "}
                  is created and ready to share with your partners.
                </Text>
                <Section className="mb-6 rounded-xl border border-solid border-neutral-200 bg-neutral-50 px-6 py-4">
                  <Row>
                    <Column width={10}>
                      <Img
                        src={program.logo || DUB_LOGO}
                        alt={program.name}
                        height="32"
                        width="32"
                        className="mr-4 rounded-md"
                      />
                    </Column>

                    <Column>
                      <Text className="text-md m-0 text-base font-semibold leading-none text-neutral-800">
                        {program.name}
                      </Text>

                      <Link
                        href={`${dashboardUrl}/program`}
                        className="m-0 text-xs font-medium text-neutral-800 underline"
                      >
                        {getPrettyUrl(`${dashboardUrl}/program`)}
                      </Link>
                    </Column>
                  </Row>
                </Section>
              </>
            )}

            <Heading className="mx-0 mb-6 p-0 text-base font-semibold text-black">
              Here&apos;s what you can do next:
            </Heading>

            {program ? (
              <>
                <Text className="mb-4 text-sm leading-5 text-neutral-800">
                  1.{" "}
                  <span className="font-semibold text-black">
                    Connect your bank account
                  </span>
                  :{" "}
                  <Link
                    href="https://dub.co/help/article/how-to-set-up-bank-account"
                    className="font-medium text-neutral-500 underline underline-offset-2"
                  >
                    Set up a bank account
                  </Link>{" "}
                  to start paying out commissions to your partners.
                </Text>

                <Text className="mb-4 text-sm leading-5 text-neutral-800">
                  2.{" "}
                  <span className="font-semibold text-black">
                    Create your program application form
                  </span>
                  : Use our{" "}
                  <Link
                    href={`${dashboardUrl}/program/groups/default/branding`}
                    className="font-medium text-neutral-500 underline underline-offset-2"
                  >
                    interactive builder
                  </Link>{" "}
                  to create a beautiful, branded program application form.
                </Text>
                <Text className="mb-4 text-sm leading-5 text-neutral-800">
                  3.{" "}
                  <span className="font-semibold text-black">
                    Set up conversion tracking
                  </span>
                  :{" "}
                  <Link
                    href={`${dashboardUrl}/settings/tracking`}
                    className="font-medium text-neutral-500 underline underline-offset-2"
                  >
                    Follow our quickstart guide
                  </Link>{" "}
                  to set up conversion tracking for your program.
                </Text>
                <Text className="mb-4 text-sm leading-5 text-neutral-800">
                  4.{" "}
                  <span className="font-semibold text-black">
                    Invite your partners
                  </span>
                  : Easily{" "}
                  <Link
                    href={`${dashboardUrl}/program/partners`}
                    className="font-medium text-neutral-500 underline underline-offset-2"
                  >
                    invite influencers, affiliates, and users
                  </Link>{" "}
                  to your program, or{" "}
                  <Link
                    href="https://dub.co/docs/partners/embedded-referrals"
                    className="font-medium text-neutral-500 underline underline-offset-2"
                  >
                    enroll them automatically.
                  </Link>
                </Text>
                <Text className="mb-0 text-sm leading-5 text-neutral-800">
                  5.{" "}
                  <span className="font-semibold text-black">
                    Create more rewards
                  </span>{" "}
                  - Set up{" "}
                  <Link
                    href={`${dashboardUrl}/program/rewards`}
                    className="font-medium text-neutral-500 underline underline-offset-2"
                  >
                    click, lead, and sale-based rewards
                  </Link>{" "}
                  to incentivize your partners to drive more traffic and
                  conversions.
                </Text>
              </>
            ) : (
              <></>
            )}

            <Text className="mb-8 text-sm leading-5 text-neutral-800">
              You&apos;ll have access to all {planLabel} features during your
              trial, with trial usage limits in place.
              <br />
              <br />
              To remove these limits, you can activate your paid plan at any
              time.
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
