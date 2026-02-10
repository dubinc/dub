import { DUB_THUMBNAIL, DUB_WORDMARK, getPrettyUrl } from "@dub/utils";
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
import { Footer } from "../components/footer";

export default function WelcomeEmail({
  email = "panic@thedis.co",
  workspace,
  program,
  hasDubPartners = true,
  unsubscribeUrl,
}: {
  email: string;
  workspace?: {
    slug: string;
    name: string;
    logo: string | null;
  };
  program?: {
    slug: string;
    name: string;
    logo: string | null;
  };
  hasDubPartners?: boolean;
  unsubscribeUrl: string;
}) {
  const workspaceUrl = workspace
    ? `https://app.dub.co/${workspace?.slug}`
    : "https://app.dub.co";

  return (
    <Html>
      <Head />
      <Preview>Welcome to Dub</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>
            <Heading className="mx-0 my-7 p-0 text-xl font-semibold text-black">
              Welcome to Dub!
            </Heading>
            <Text className="mb-8 text-sm leading-6 text-neutral-600">
              Thank you for signing up for Dub! You can now start creating and
              managing short links and track their performance.
            </Text>

            {workspace ? (
              <>
                <Heading className="mx-0 mb-2 p-0 text-base font-semibold text-black">
                  Your workspace
                </Heading>
                <Section className="mb-6 rounded-xl border border-solid border-neutral-200 bg-neutral-50 p-4">
                  <Row>
                    <Column width={10}>
                      <Img
                        src={workspace.logo || DUB_THUMBNAIL}
                        alt={workspace.name}
                        height="32"
                        width="32"
                        className="mr-4 rounded-md"
                      />
                    </Column>

                    <Column>
                      <Text className="text-md m-0 text-base font-semibold leading-none text-neutral-800">
                        {workspace.name}
                      </Text>

                      <Link
                        href={workspaceUrl}
                        className="m-0 text-xs font-medium text-neutral-600 underline"
                      >
                        {getPrettyUrl(workspaceUrl)}
                      </Link>
                    </Column>
                  </Row>
                </Section>
              </>
            ) : (
              <Hr />
            )}

            {program && (
              <>
                <Heading className="mx-0 mb-2 p-0 text-base font-semibold text-black">
                  Your program
                </Heading>
                <Section className="mb-6 rounded-xl border border-solid border-neutral-200 bg-neutral-50 p-4">
                  <Row>
                    <Column width={10}>
                      <Img
                        src={program.logo || DUB_THUMBNAIL}
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
                        href={`${workspaceUrl}/program`}
                        className="m-0 text-xs font-medium text-neutral-600 underline"
                      >
                        {getPrettyUrl(`${workspaceUrl}/program`)}
                      </Link>
                    </Column>
                  </Row>
                </Section>
              </>
            )}

            <Heading className="mx-0 mb-0 mt-6 p-0 text-base font-semibold text-black">
              {hasDubPartners ? "Complete setup" : "Getting started"}
            </Heading>

            <Text className="mb-6 mt-0 text-sm leading-6 text-neutral-600">
              {program
                ? "Finish setting up your program to get the most out of Dub Partners."
                : "Get familiar with Dub by exploring the platform and features."}
            </Text>

            {program ? (
              <>
                <Text className="mb-4 text-sm leading-6 text-neutral-600">
                  1. Set up conversion tracking:{" "}
                  <Link
                    href="https://dub.co/docs/conversions/quickstart"
                    className="text-neutral-600 underline underline-offset-2"
                  >
                    Follow our quickstart guide
                  </Link>{" "}
                  to set up conversion tracking for your program.
                </Text>

                <Text className="mb-4 text-sm leading-6 text-neutral-600">
                  2. Create your program application form: Use our{" "}
                  <Link
                    href="https://dub.co/help/article/program-application-form"
                    className="text-neutral-600 underline underline-offset-2"
                  >
                    interactive builder
                  </Link>{" "}
                  to create a beautiful, branded program application page to get
                  more partners applying to join your program.
                </Text>

                <Text className="mb-4 text-sm leading-6 text-neutral-600">
                  3. Connect your bank account:{" "}
                  <Link
                    href="https://dub.co/help/article/how-to-set-up-bank-account"
                    className="text-neutral-600 underline underline-offset-2"
                  >
                    Set up a bank account
                  </Link>{" "}
                  to start paying out commissions to your partners.
                </Text>

                <Text className="mb-4 text-sm leading-6 text-neutral-600">
                  4. Invite your partners: Easily{" "}
                  <Link
                    href="https://dub.co/help/article/inviting-partners"
                    className="text-neutral-600 underline underline-offset-2"
                  >
                    Invite influencers, affiliates, and users
                  </Link>{" "}
                  to your program, or{" "}
                  <Link
                    href="https://dub.co/help/article/inviting-partners#enrolling-a-partner-automatically"
                    className="text-neutral-600 underline underline-offset-2"
                  >
                    enroll them automatically.
                  </Link>
                </Text>

                <Text className="mb-4 text-sm leading-6 text-neutral-600">
                  5. Create more rewards: Set up{" "}
                  <Link
                    href="https://dub.co/help/article/partner-rewards"
                    className="text-neutral-600 underline underline-offset-2"
                  >
                    click, lead, and sale-based rewards
                  </Link>{" "}
                  to incentivize your partners to drive more traffic and
                  conversions.
                </Text>
              </>
            ) : (
              <>
                <Text className="mb-4 text-sm leading-6 text-neutral-600">
                  1. Set up your domain:{" "}
                  <Link
                    href="https://dub.co/help/article/how-to-add-custom-domain"
                    className="text-neutral-600 underline underline-offset-2"
                  >
                    Add a custom domain
                  </Link>{" "}
                  or{" "}
                  <Link
                    href="https://dub.co/help/article/free-dot-link-domain"
                    className="text-neutral-600 underline underline-offset-2"
                  >
                    claim a free .link domain
                  </Link>{" "}
                  and start creating your branded short links.
                </Text>

                {hasDubPartners ? (
                  <>
                    <Text className="mb-4 text-sm leading-6 text-neutral-600">
                      2. Track conversions:{" "}
                      <Link
                        href="https://app.dub.co/settings/analytics"
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
                      to grow your revenue on autopilot with advanced reward
                      structures, dual-sided incentives, and real-time
                      attribution.
                    </Text>
                  </>
                ) : (
                  <>
                    <Text className="mb-4 text-sm leading-6 text-neutral-600">
                      2. Create a short link:{" "}
                      <Link
                        href="https://dub.co/help/article/how-to-create-link"
                        className="text-neutral-600 underline underline-offset-2"
                      >
                        Create your first Dub short link
                      </Link>{" "}
                      and explore the different features available.
                    </Text>

                    <Text className="mb-4 text-sm leading-6 text-neutral-600">
                      3. Explore analytics:{" "}
                      <Link
                        href="https://dub.co/help/article/dub-analytics"
                        className="text-neutral-600 underline underline-offset-2"
                      >
                        View the performance
                      </Link>{" "}
                      of your short links with graphs and detailed analytics.
                    </Text>
                  </>
                )}

                <Text className="mb-4 text-sm leading-6 text-neutral-600">
                  4. Explore the API:{" "}
                  <Link
                    href="https://dub.co/docs/introduction"
                    className="text-neutral-600 underline underline-offset-2"
                  >
                    Check out our docs
                  </Link>{" "}
                  for programmatic link creation
                  {hasDubPartners ? " and partner management" : ""}.
                </Text>
              </>
            )}

            <Section className="my-8">
              <Link
                className="rounded-lg bg-black px-4 py-2.5 text-center text-[14px] font-medium text-white no-underline"
                href="https://app.dub.co"
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
