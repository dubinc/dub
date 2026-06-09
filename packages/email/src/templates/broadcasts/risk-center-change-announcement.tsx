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
import { Footer } from "../../components/footer";

export default function RiskCenterChangeAnnouncement({
  email = "panic@thedis.co",
  workspace = {
    slug: "acme",
  },
  program = {
    name: "Acme",
  },
}: {
  email: string;
  workspace: {
    slug: string;
  };
  program: {
    name: string;
  };
}) {
  return (
    <Html>
      <Head>
        <style>{`
          @media only screen and (max-width: 600px) {
            .email-container {
              padding-left: 16px !important;
              padding-right: 16px !important;
            }
          }
        `}</style>
      </Head>
      <Preview>
        We've renamed Fraud Detection to Risk Center and added a 30-day
        auto-expiry for unresolved risk events.
      </Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="email-container mx-auto my-10 max-w-[600px] px-10 py-5">
            <Section className="mt-2">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>

            <Heading className="mx-0 mb-2 mt-10 text-xl font-semibold text-black">
              Updates to your fraud protection tools
            </Heading>

            <Text className="text-sm leading-6 text-neutral-600">
              We've made some changes to the fraud protection tools for the{" "}
              <strong>{program.name}</strong> program that we wanted to let you
              know about.
            </Text>

            <Text className="mt-0 text-sm leading-6 text-neutral-600">
              <strong>Fraud Detection</strong> has been renamed to{" "}
              <strong>Risk Center</strong>.
            </Text>

            <Text className="text-sm leading-6 text-neutral-600">
              All existing events, rules, and settings remain unchanged — just
              the names are different.
            </Text>

            <Heading className="mx-0 mb-2 mt-8 text-base font-semibold text-black">
              30-day auto-expiry for risk events
            </Heading>

            <Text className="mt-0 text-sm leading-6 text-neutral-600">
              Unresolved risk events will now{" "}
              <strong>automatically expire after 30 days</strong> if no new
              activity is detected. This helps keep your risk dashboard focused
              on active issues.
            </Text>

            <Text className="text-sm leading-6 text-neutral-600">
              You currently have pending risk events for{" "}
              <strong>{program.name}</strong> — review them before they expire.
            </Text>

            <Section className="mb-10 mt-6 text-center">
              <Link
                href={`https://app.dub.co/${workspace.slug}/program/risks`}
                className="box-border inline-block rounded-lg bg-neutral-900 px-6 py-3 text-center text-sm font-medium text-white no-underline"
                style={{
                  backgroundColor: "#171717",
                  color: "#ffffff",
                  borderRadius: "8px",
                  padding: "12px 24px",
                  textDecoration: "none",
                  display: "inline-block",
                  fontWeight: "500",
                  fontSize: "14px",
                }}
              >
                Go to Risk Center
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
