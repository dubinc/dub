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

export type EmailDomainStatus =
  | "pending"
  | "verified"
  | "failed"
  | "temporary_failure"
  | "not_started";

export default function EmailDomainStatusChanged({
  email = "panic@thedis.co",
  domain = "example.com",
  workspace = { slug: "acme", name: "Acme" },
  oldStatus = "pending",
  newStatus = "verified",
}: {
  email: string;
  domain: string;
  workspace: { slug: string; name: string };
  oldStatus: EmailDomainStatus;
  newStatus: EmailDomainStatus;
}) {
  const isVerified = newStatus === "verified";
  const isFailed = newStatus === "failed" || newStatus === "temporary_failure";
  const isPending = newStatus === "pending" || newStatus === "not_started";

  const heading = isVerified
    ? "Your email domain has been successfully verified"
    : isFailed
      ? "Your email domain verification has failed"
      : "Your email domain status has changed";

  return (
    <Html>
      <Head />
      <Preview>{heading}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>
            <Heading className="mx-0 my-7 p-0 text-lg font-medium text-black">
              {heading}
            </Heading>

            {isVerified ? (
              <Text className="text-sm leading-6 text-black">
                Your email domain{" "}
                <code className="text-purple-600">{domain}</code> for your Dub
                workspace{" "}
                <Link
                  href={`https://app.dub.co/${workspace.slug}`}
                  className="font-medium text-blue-600 no-underline"
                >
                  {workspace.name}↗
                </Link>{" "}
                has been successfully verified. You can now send emails from
                this domain.
              </Text>
            ) : isFailed ? (
              <>
                <Text className="text-sm leading-6 text-black">
                  Your email domain{" "}
                  <code className="text-purple-600">{domain}</code> for your Dub
                  workspace{" "}
                  <Link
                    href={`https://app.dub.co/${workspace.slug}`}
                    className="font-medium text-blue-600 no-underline"
                  >
                    {workspace.name}↗
                  </Link>{" "}
                  verification has failed. Please check your DNS records and try
                  again.
                </Text>
                <Text className="text-sm leading-6 text-black">
                  Please ensure all required DNS records are correctly
                  configured in your domain settings. You can find the required
                  records in your email domain settings.
                </Text>
              </>
            ) : (
              <Text className="text-sm leading-6 text-black">
                Your email domain{" "}
                <code className="text-purple-600">{domain}</code> for your Dub
                workspace{" "}
                <Link
                  href={`https://app.dub.co/${workspace.slug}`}
                  className="font-medium text-blue-600 no-underline"
                >
                  {workspace.name}↗
                </Link>{" "}
                status has changed from <strong>{oldStatus}</strong> to{" "}
                <strong>{newStatus}</strong>.
              </Text>
            )}

            {isPending && (
              <Text className="text-sm leading-6 text-black">
                We're still verifying your domain. This process may take a few
                minutes. You'll receive another notification once verification
                is complete.
              </Text>
            )}

            <Section className="my-8">
              <Link
                className="rounded-lg bg-black px-6 py-3 text-center text-[12px] font-semibold text-white no-underline"
                href={`https://app.dub.co/${workspace.slug}/links/domains/email`}
              >
                View email domain
              </Link>
            </Section>
            <Footer
              email={email}
              notificationSettingsUrl={`https://app.dub.co/${workspace.slug}/settings/notifications`}
            />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
