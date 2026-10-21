import { DUB_WORDMARK, nFormatter, pluralize } from "@dub/utils";
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

export type FailedEndpoint = {
  method: string;
  routePattern: string;
  statusCode: number;
  failureCount: number;
};

export default function CriticalApiFailed({
  email = "panic@thedis.co",
  workspace = {
    name: "Acme, Inc",
    slug: "acme",
  },
  failures = [
    {
      method: "POST",
      routePattern: "/track/lead",
      statusCode: 403,
      failureCount: 42,
    },
  ],
  hourLabel = "Jan 1, 2026, 14:00–15:00 UTC",
}: {
  email: string;
  workspace: {
    name: string;
    slug: string;
  };
  failures: FailedEndpoint[];
  hourLabel: string;
}) {
  const statusCodes = [...new Set(failures.map((f) => f.statusCode))].sort(
    (a, b) => a - b,
  );
  const statusLabel = statusCodes.join(" / ");

  const logsUrl = (failure: FailedEndpoint) => {
    const params = new URLSearchParams({
      routePattern: failure.routePattern,
      statusCode: String(failure.statusCode),
      method: failure.method,
    });

    return `https://app.dub.co/${workspace.slug}/settings/logs?${params}`;
  };

  return (
    <Html>
      <Head />
      <Preview>Critical API endpoints are failing</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>
            <Heading className="mx-0 my-7 p-0 text-xl font-medium text-black">
              Critical API endpoints are failing
            </Heading>
            <Text className="text-sm leading-6 text-black">
              We detected repeated authentication failures for critical API
              endpoints in your workspace <strong>{workspace.name}</strong>{" "}
              during <strong>{hourLabel}</strong>. These requests returned{" "}
              {statusLabel} with no successful responses on the same endpoint,
              so your integration may not be working as expected.
            </Text>
            {failures.map((failure) => (
              <Text
                key={`${failure.method}:${failure.routePattern}:${failure.statusCode}`}
                className="text-sm leading-6 text-black"
              >
                <code className="text-purple-600">
                  {failure.method} {failure.routePattern}
                </code>
                {" — "}
                <strong>{failure.statusCode}</strong> (
                {nFormatter(failure.failureCount)}{" "}
                {pluralize("request", failure.failureCount)}){" · "}
                <Link
                  href={logsUrl(failure)}
                  className="font-medium text-blue-600 no-underline"
                >
                  View logs
                </Link>
              </Text>
            ))}
            <Text className="text-sm leading-6 text-black">
              Common causes include an expired or revoked API key, a key missing
              the required permissions, or a member who owned the key leaving
              the workspace. Update the key used by your integration to restore
              functionality.
            </Text>
            <Section className="mb-8 mt-8">
              <Link
                className="rounded-lg bg-black px-6 py-3 text-center text-[12px] font-semibold text-white no-underline"
                href={`https://app.dub.co/${workspace.slug}/settings/tokens`}
              >
                Manage API keys
              </Link>
            </Section>
            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
