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
  Hr,
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
import { type TrialMarketingEmailProps } from "../../types";

export default function TrialStartedEmail({
  email = "panic@thedis.co",
  plan = "Advanced",
  workspace = {
    slug: "acme",
    logo: DUB_LOGO,
    name: "Acme",
  },
  program,
}: Omit<TrialMarketingEmailProps, "workspaceSlug"> & {
  workspace: {
    slug: string;
    logo: string | null;
    name: string;
  };
  program?: {
    slug: string;
    name: string;
    logo: string | null;
  };
}) {
  const planLabel = capitalize(plan);
  const dashboardUrl = `https://app.dub.co/${workspace.slug}`;

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

            <Text className="mb-6 mt-5 text-sm leading-5 text-neutral-600">
              {program
                ? `Your program ${program.name} is set up and ready for you to share with your partners.`
                : "Your workspace is set up and ready for you to collaborate with your teammates."}
            </Text>
            <Section className="mb-6 rounded-xl border border-solid border-neutral-200 bg-neutral-50 px-6 py-4">
              <Row>
                <Column width={10}>
                  <Img
                    src={program?.logo || workspace.logo || DUB_LOGO}
                    alt={program?.name || workspace.name}
                    height="32"
                    width="32"
                    className="mr-4 rounded-md"
                  />
                </Column>

                <Column>
                  <Text className="text-md m-0 text-base font-semibold leading-none text-neutral-800">
                    {program?.name || workspace.name}
                  </Text>

                  <Link
                    href={`${dashboardUrl}/${program ? "program" : "links"}`}
                    className="m-0 text-xs font-medium text-neutral-800 underline"
                  >
                    {getPrettyUrl(
                      `${dashboardUrl}/${program ? "program" : "links"}`,
                    )}
                  </Link>
                </Column>
              </Row>
            </Section>

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
              <>
                <Text className="mb-4 text-sm leading-5 text-neutral-800">
                  1.{" "}
                  <span className="font-semibold text-black">
                    Use a custom domain
                  </span>
                  :{" "}
                  <Link
                    href="https://dub.co/help/article/how-to-add-custom-domain"
                    className="font-medium text-neutral-500 underline underline-offset-2"
                  >
                    Add a custom domain
                  </Link>{" "}
                  to increase trust and click-through rates on every link.
                </Text>

                <Text className="mb-4 text-sm leading-5 text-neutral-800">
                  2.{" "}
                  <span className="font-semibold text-black">
                    Customize your link preview
                  </span>
                  :{" "}
                  <Link
                    href="https://dub.co/help/article/custom-link-previews"
                    className="font-medium text-neutral-500 underline underline-offset-2"
                  >
                    Control the title, image, and description
                  </Link>{" "}
                  to improve how your links appear and perform.
                </Text>

                <Text className="mb-4 text-sm leading-5 text-neutral-800">
                  3.{" "}
                  <span className="font-semibold text-black">
                    Explore analytics
                  </span>
                  :{" "}
                  <Link
                    href="https://dub.co/help/article/dub-analytics"
                    className="font-medium text-neutral-500 underline underline-offset-2"
                  >
                    View the performance
                  </Link>{" "}
                  of your links with real-time data and advanced filtering
                  capabilities.
                </Text>

                <Text className="mb-4 text-sm leading-5 text-neutral-800">
                  4.{" "}
                  <span className="font-semibold text-black">
                    Invite your teammates
                  </span>
                  :{" "}
                  <Link
                    href="https://dub.co/help/article/how-to-invite-teammates"
                    className="font-medium text-neutral-500 underline underline-offset-2"
                  >
                    Learn how to invite teammates
                  </Link>{" "}
                  to your workspace and start collaborating.
                </Text>

                <Text className="mb-0 text-sm leading-5 text-neutral-800">
                  5.{" "}
                  <span className="font-semibold text-black">
                    Explore the API
                  </span>
                  :{" "}
                  <Link
                    href="https://dub.co/docs/api-reference/links/create"
                    className="font-medium text-neutral-500 underline underline-offset-2"
                  >
                    Check out our docs
                  </Link>{" "}
                  to learn how to programmatically manage your Dub links.
                </Text>
              </>
            )}

            <Hr />

            <Text className="mb-8 text-sm leading-5 text-neutral-800">
              You&apos;ll have access to all{" "}
              <Link
                href={`https://app.dub.co/${workspace.slug}/settings/billing/upgrade`}
                className="font-medium text-neutral-500 underline underline-offset-2"
              >
                {planLabel} features
              </Link>{" "}
              during your trial, with{" "}
              <Link
                href="https://dub.co/help/article/free-trial#trial-limits"
                className="font-medium text-neutral-500 underline underline-offset-2"
              >
                trial usage limits
              </Link>{" "}
              in place. To remove these limits, you can activate your paid plan
              at any time.
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
