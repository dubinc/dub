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
import Footer from "./components/footer";

export default function PartnerInvite({
  email = "panic@thedis.co",
  appName = "Dub.co",
  programName = "Cal",
}: {
  email: string;
  appName: string;
  programName: string;
}) {
  const url = "https://partners.dub.co";

  return (
    <Html>
      <Head />
      <Preview>Sign up for {programName}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[500px] rounded border border-solid border-gray-200 px-10 py-5">
            <Section className="mt-8">
              <Img
                src={DUB_WORDMARK}
                height="40"
                alt={appName}
                className="mx-auto my-0"
              />
            </Section>

            <Heading className="mx-0 my-7 p-0 text-center text-xl font-semibold text-black">
              Sign up for {programName}
            </Heading>

            <Section className="mb-8 text-center">
              <Link
                className="rounded-full bg-black px-6 py-3 text-center text-[12px] font-semibold text-white no-underline"
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
