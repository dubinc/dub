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

export default function PartnerIdentityVerificationFailed({
  partner = {
    name: "John",
    email: "panic@thedis.co",
  },
  failureType = "countryChange",
  failureReasonText = "Document Obscured: ID document is partially obscured (e.g. by fingers)",
}: {
  partner: {
    name: string;
    email: string;
  };
  failureType?: "declined" | "resubmissionRequested" | "countryChange";
  failureReasonText: string;
}) {
  const isCountryChange = failureType === "countryChange";
  const isResubmission = failureType === "resubmissionRequested";

  let previewText = "Your identity verification failed";
  let headingText = "Identity verification failed";

  if (isCountryChange) {
    previewText = "Identity re-verification required";
    headingText = "Identity re-verification required";
  } else if (isResubmission) {
    previewText = "Please resubmit your identity verification";
    headingText = "Resubmission requested";
  }

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mb-8 mt-6">
              <Img src={DUB_WORDMARK} width="61" height="32" alt="dub" />
            </Section>

            <Heading className="mx-0 p-0 text-lg font-semibold text-neutral-800">
              {headingText}
            </Heading>

            {isCountryChange ? (
              <>
                <Text className="text-sm leading-6 text-neutral-600">
                  Hi {partner.name}, you recently changed your account country.
                  Because your new country doesn't match the country on your
                  verified identity document, you need to complete identity
                  verification again.
                </Text>

                <Text className="text-sm leading-6 text-neutral-600">
                  Please log in to your dashboard to start a new verification.
                </Text>
              </>
            ) : isResubmission ? (
              <>
                <Text className="text-sm leading-6 text-neutral-600">
                  Hi {partner.name}, we need you to resubmit your identity
                  verification because {failureReasonText}.
                </Text>

                <Text className="text-sm leading-6 text-neutral-600">
                  Please log in to your dashboard and resubmit your documents.
                </Text>
              </>
            ) : (
              <>
                <Text className="text-sm leading-6 text-neutral-600">
                  Hi {partner.name}, your identity verification couldn't be
                  completed because {failureReasonText}.
                </Text>

                <Text className="text-sm leading-6 text-neutral-600">
                  Please log back in to your dashboard and resubmit your
                  details.
                </Text>
              </>
            )}

            <Section className="mb-10 mt-6">
              <Link
                className="rounded-lg bg-neutral-900 px-6 py-3 text-[13px] font-medium text-white no-underline"
                href="https://partners.dub.co/profile"
              >
                Go to your dashboard
              </Link>
            </Section>

            <Footer email={partner.email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
