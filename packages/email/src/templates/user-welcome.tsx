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
import { Footer } from "../components/footer";

export function UserWelcome({
  name = "John Doe",
  email = "panic@thedis.co",
  workspace = {
    name: "Acme",
    slug: "acme",
  },
}: {
  name: string | null;
  email: string;
  workspace: {
    name: string;
    slug: string;
  };
}) {
  const workspaceUrl = `https://app.dub.co/${workspace.slug}`;

  return (
    <Html>
      <Head />
      <Preview>You're officially a Dub Partner</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] px-10 py-5">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>

            <Heading className="mx-0 my-6 p-0 text-lg font-medium text-black">
              Welcome {name}!
            </Heading>

            <Text className="text-sm leading-5 text-neutral-600">
              Your {workspace.name} workspace is ready. Time to shorten, share,
              and start tracking links like a pro.
            </Text>

            <Hr className="my-6 border-b border-neutral-200" />

            <Heading
              className="mb-6 text-base font-semibold leading-6 text-neutral-900"
              as="h3"
            >
              Getting started
            </Heading>

            <Text className="mb-4 text-sm leading-5 text-neutral-800">
              1. <span className="font-medium">Set up your domain</span> - Add a{" "}
              <Link
                href={`${workspaceUrl}/settings/domains`}
                className="font-semibold text-neutral-800 underline underline-offset-2"
              >
                custom domain
              </Link>{" "}
              or claim{" "}
              <Link
                href={`${workspaceUrl}/settings/domains`}
                className="font-semibold text-neutral-800 underline underline-offset-2"
              >
                a free .link
              </Link>
              , then create your short links.
            </Text>

            <Text className="mb-4 text-sm leading-5 text-neutral-800">
              2. <span className="font-medium">View analytics</span> - Monitor{" "}
              <Link
                href={`${workspaceUrl}/analytics`}
                className="font-semibold text-neutral-800 underline underline-offset-2"
              >
                click data
              </Link>{" "}
              in real time and see what’s working.
            </Text>

            <Text className="mb-4 text-sm leading-5 text-neutral-800">
              3. <span className="font-medium">Track conversions</span> - Track
              leads and sales with our built-in{" "}
              <Link
                href={`${workspaceUrl}/events`}
                className="font-semibold text-neutral-800 underline underline-offset-2"
              >
                conversion tools
              </Link>
              .
            </Text>

            <Text className="mb-4 text-sm leading-5 text-neutral-800">
              4. <span className="font-medium">Explore the API</span> -{" "}
              <Link
                href="https://dub.co/docs/api-reference/introduction"
                className="font-semibold text-neutral-800 underline underline-offset-2"
              >
                Check out our docs
              </Link>{" "}
              to automate link creation and integrate with your stack.
            </Text>

            <Section className="my-10">
              <Link
                href={workspaceUrl}
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

export default UserWelcome;
