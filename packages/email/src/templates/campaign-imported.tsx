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

export default function CampaignImported({
  email = "panic@thedis.co",
  provider = "Rewardful",
  workspace = {
    slug: "acme",
  },
  program = {
    name: "Cal",
  },
}: {
  email: string;
  provider: "Rewardful" | "Tolt";
  workspace: {
    slug: string;
  };
  program: {
    name: string;
  };
}) {
  return (
    <Html>
      <Head />
      <Preview>Your {provider} campaign has been imported</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mb-8 mt-6">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>
            <Heading className="mx-0 my-7 p-0 text-lg font-medium text-black">
              Your {provider} campaign has been imported
            </Heading>
            <Text className="text-sm leading-6 text-black">
              We have successfully imported your {provider} campaign{" "}
              <Link
                href={`https://app.dub.co/${workspace.slug}/program/partners`}
                className="font-medium text-blue-600 no-underline"
              >
                {program.name}↗
              </Link>{" "}
              into Dub.
            </Text>
            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
