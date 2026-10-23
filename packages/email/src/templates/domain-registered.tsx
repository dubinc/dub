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

export default function DomainRegistered({
  email = "panic@thedis.co",
  domain = "dub.link",
  workspaceSlug = "dub",
}: {
  email: string;
  domain: string;
  workspaceSlug: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>Your premium .link domain has been registered!</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>
            <Heading className="mx-0 my-7 p-0 text-lg font-medium text-black">
              Your premium .link domain has been registered!
            </Heading>
            <Text className="text-sm leading-6 text-black">
              Your premium domain{" "}
              <code className="text-purple-600">{domain}</code> has been
              successfully registered for your Dub workspace{" "}
              <Link
                href={`https://app.dub.co/${workspaceSlug}`}
                className="font-medium text-blue-600 no-underline"
              >
                {workspaceSlug}↗
              </Link>
              .
            </Text>
            <Section className="my-8">
              <Link
                className="rounded-lg bg-black px-6 py-3 text-center text-[12px] font-semibold text-white no-underline"
                href={`https://app.dub.co/${workspaceSlug}/settings/domains`}
              >
                Manage your domain
              </Link>
            </Section>
            <Text className="text-sm leading-6 text-black">
              Once the domain is fully provisioned, you can start creating links
              with it. This process is usually completed within 1 hour, but can
              sometimes take up to 12 hours (for the DNS records and SSL certs
              to fully propagate).
            </Text>
            <Text className="text-sm leading-6 text-black">
              If your domain is not active after 12 hours, please reply to this
              email and we will look into it.
            </Text>
            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
