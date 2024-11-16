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
  programName = "Acme",
  programLogo = "https://assets.dub.co/logo.png",
}: {
  email: string;
  appName: string;
  programName: string;
  programLogo: string | null;
}) {
  return (
    <Html>
      <Head />
      <Preview>Sign up for {programName}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[500px] rounded border border-solid border-gray-200 px-10 py-5">
            <Section className="my-8">
              <Img
                src={programLogo || "https://assets.dub.co/logo.png"}
                height="32"
                alt={appName}
              />
            </Section>

            <Heading className="mx-0 p-0 text-lg font-medium text-black">
              {programName} invited you to join Dub Partners
            </Heading>

            <Text className="text-sm leading-6 text-gray-600">
              {programName} uses Dub Partners to power their partnership
              programs and wants to partner with great people like yourself!
            </Text>

            <Section className="mb-12 mt-8">
              <Link
                className="rounded-md bg-neutral-900 px-4 py-3 text-[12px] font-medium text-white no-underline"
                href="https://partners.dub.co"
              >
                Accept Invite
              </Link>
            </Section>
            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
