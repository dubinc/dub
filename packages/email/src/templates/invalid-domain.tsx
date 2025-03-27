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

export function InvalidDomain({
  email = "panic@thedis.co",
  domain = "dub.sh",
  workspaceSlug = "dub",
  invalidDays = 14,
}: {
  email: string;
  domain: string;
  workspaceSlug: string;
  invalidDays: number;
}): JSX.Element {
  return (
    <Html>
      <Head />
      <Preview>Invalid Domain Configuration</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mt-6 mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>
            <Heading className="mx-0 my-7 p-0 text-lg font-medium text-black">
              Invalid Domain Configuration
            </Heading>
            <Text className="text-sm leading-6 text-black">
              Your domain <code className="text-purple-600">{domain}</code> for
              your Dub workspace{" "}
              <Link
                href={`https://app.dub.co/${workspaceSlug}`}
                className="font-medium text-blue-600 no-underline"
              >
                {workspaceSlug}↗
              </Link>{" "}
              has been invalid for {invalidDays} days.
            </Text>
            <Text className="text-sm leading-6 text-black">
              If your domain remains unconfigured for 30 days, it will be
              automatically deleted from Dub. Please click the link below to
              configure your domain.
            </Text>
            <Section className="my-8">
              <Link
                className="rounded-lg bg-black px-6 py-3 text-center text-[12px] font-semibold text-white no-underline"
                href={`https://app.dub.co/${workspaceSlug}/settings/domains`}
              >
                Configure domain
              </Link>
            </Section>
            <Text className="text-sm leading-6 text-black">
              If you do not want to keep this domain on Dub, you can{" "}
              <Link
                href={`https://app.dub.co/${workspaceSlug}/settings/domains`}
                className="font-medium text-blue-600 no-underline"
              >
                delete it
              </Link>{" "}
              or simply ignore this email. To respect your inbox,{" "}
              {invalidDays < 28
                ? `we will only send you one more email about this in ${
                    28 - invalidDays
                  } days.`
                : "this will be the last time we will email you about this."}
            </Text>
            <Footer
              email={email}
              notificationSettingsUrl={`https://app.dub.co/${workspaceSlug}/settings/notifications`}
            />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export default InvalidDomain;
