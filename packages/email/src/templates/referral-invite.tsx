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
import { Footer } from "../components/footer";

export function ReferralInvite({
  email = "panic@thedis.co",
  url = "https://dub.co",
  workspaceUser = "Brendon Urie",
  workspaceUserEmail = "panic@thedis.co",
}: {
  email: string;
  url: string;
  workspaceUser: string | null;
  workspaceUserEmail: string | null;
}) {
  return (
    <Html>
      <Head />
      <Preview>Sign up for Dub</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>
            <Heading className="mx-0 my-7 p-0 text-xl font-medium text-black">
              Sign up for Dub
            </Heading>
            {workspaceUser && workspaceUserEmail ? (
              <Text className="text-sm leading-6 text-black">
                <strong>{workspaceUser}</strong> (
                <Link
                  className="text-blue-600 no-underline"
                  href={`mailto:${workspaceUserEmail}`}
                >
                  {workspaceUserEmail}
                </Link>
                ) has invited you to start using Dub!
              </Text>
            ) : (
              <Text className="text-sm leading-6 text-black">
                You have been invited to start using Dub!
              </Text>
            )}
            <Section className="mb-8 mt-8">
              <Link
                className="rounded-lg bg-black px-6 py-3 text-center text-[12px] font-semibold text-white no-underline"
                href={url}
              >
                Learn More
              </Link>
            </Section>
            <Text className="text-sm leading-6 text-black">
              or copy and paste this URL into your browser:
            </Text>
            <Text className="max-w-sm flex-wrap break-words font-medium text-purple-600 no-underline">
              {url.replace(/^https?:\/\//, "")}
            </Text>
            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export default ReferralInvite;
