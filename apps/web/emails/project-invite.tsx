import {
  Body,
  Link,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import { DUB_LOGO } from "../lib/constants";
import Footer from "./components/footer";

export default function ProjectInvite({
  email = "panicking@thedis.co",
  url = "http://localhost:8888/api/auth/callback/email?callbackUrl=http%3A%2F%2Fapp.localhost%3A3000%2Flogin&token=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx&email=youremail@gmail.com",
  projectName = "Acme",
  projectUser = "Brendon Urie",
  projectUserEmail = "panic@thedis.co",
}: {
  email: string;
  url: string;
  projectName: string;
  projectUser: string | null;
  projectUserEmail: string | null;
}) {
  return (
    <Html>
      <Head />
      <Preview>Join {projectName} on Dub</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[500px] rounded border border-solid border-gray-200 px-10 py-5">
            <Section className="mt-8">
              <Img
                src={DUB_LOGO}
                width="40"
                height="40"
                alt="Dub"
                className="mx-auto my-0"
              />
            </Section>
            <Heading className="mx-0 my-7 p-0 text-center text-xl font-semibold text-black">
              Join {projectName} on Dub
            </Heading>
            {projectUser && projectUserEmail ? (
              <Text className="text-sm leading-6 text-black">
                <strong>{projectUser}</strong> (
                <Link
                  className="text-blue-600 no-underline"
                  href={`mailto:${projectUserEmail}`}
                >
                  {projectUserEmail}
                </Link>
                ) has invited you to join the <strong>{projectName}</strong>{" "}
                project on Dub!
              </Text>
            ) : (
              <Text className="text-sm leading-6 text-black">
                You have been invited to join the <strong>{projectName}</strong>{" "}
                project on Dub!
              </Text>
            )}
            <Section className="mb-8 text-center">
              <Link
                className="rounded-full bg-black px-6 py-3 text-center text-[12px] font-semibold text-white no-underline"
                href={url}
              >
                Join Project
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
