import {
  DUB_LOGO,
  DUB_THUMBNAIL,
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
import { Footer } from "../components/footer";

export default function ProgramWelcome({
  email = "panic@thedis.co",
  workspace = {
    slug: "acme",
  },
  program = {
    slug: "acme",
    name: "Acme",
    logo: DUB_LOGO,
  },
}: {
  email: string;
  workspace: {
    slug: string;
  };
  program: {
    slug: string;
    name: string;
    logo: string | null;
  };
}) {
  const workspaceUrlPrefix = `https://app.dub.co/${workspace.slug}`;

  return (
    <Html>
      <Head />
      <Preview>Congratulations on creating a program!</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] px-10 py-5">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>
            <Heading
              className="mt-8 text-lg font-semibold leading-7 text-neutral-900"
              as="h2"
            >
              Congratulations on creating a program!
            </Heading>
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
                    href={`${workspaceUrlPrefix}/program`}
                    className="m-0 text-xs font-medium text-neutral-800 underline"
                  >
                    {getPrettyUrl(`${workspaceUrlPrefix}/program`)}
                  </Link>
                </Column>
              </Row>
            </Section>
            <Heading
              className="mb-6 text-base font-semibold leading-6 text-neutral-900"
              as="h3"
            >
              Getting started
            </Heading>
            <Text className="mb-4 text-sm leading-5 text-neutral-800">
              1.{" "}
              <span className="font-medium">
                Create your program application form
              </span>
              : Use our{" "}
              <Link
                href={`${workspaceUrlPrefix}/program/groups/default/branding`}
                className="font-semibold text-neutral-800 underline underline-offset-2"
              >
                interactive builder
              </Link>{" "}
              to create a beautiful, branded program application form to get
              more partners applying to join your program.
            </Text>
            <Text className="mb-4 text-sm leading-5 text-neutral-800">
              2. <span className="font-medium">Connect your bank account</span>:{" "}
              <Link
                href="https://dub.co/help/article/how-to-set-up-bank-account"
                className="font-semibold text-neutral-800 underline underline-offset-2"
              >
                Set up a bank account
              </Link>{" "}
              to start paying out commissions to your partners.
            </Text>
            <Text className="mb-4 text-sm leading-5 text-neutral-800">
              3. <span className="font-medium">Set up conversion tracking</span>
              :{" "}
              <Link
                href={`${workspaceUrlPrefix}/guides`}
                className="font-semibold text-neutral-800 underline underline-offset-2"
              >
                Follow our quickstart guide
              </Link>{" "}
              to set up conversion tracking for your program.
            </Text>
            <Text className="mb-4 text-sm leading-5 text-neutral-800">
              4. <span className="font-medium">Invite your partners</span>:
              Easily{" "}
              <Link
                href={`${workspaceUrlPrefix}/program/partners`}
                className="font-semibold text-neutral-800 underline underline-offset-2"
              >
                invite influencers, affiliates, and users
              </Link>{" "}
              to your program, or{" "}
              <Link
                href="https://dub.co/docs/partners/embedded-referrals"
                className="font-semibold text-neutral-800 underline underline-offset-2"
              >
                enroll them automatically.
              </Link>
            </Text>
            <Text className="mb-0 text-sm leading-5 text-neutral-800">
              5. <span className="font-medium">Create more rewards</span> - Set
              up{" "}
              <Link
                href={`${workspaceUrlPrefix}/program/rewards`}
                className="font-semibold text-neutral-800 underline underline-offset-2"
              >
                click, lead, and sale-based rewards
              </Link>{" "}
              to incentivize your partners to drive more traffic and
              conversions.
            </Text>
            <Section className="my-10">
              <Link
                href={`${workspaceUrlPrefix}/program`}
                className="box-border h-10 w-fit rounded-lg bg-black px-4 py-3 text-center text-sm leading-none text-white no-underline"
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
