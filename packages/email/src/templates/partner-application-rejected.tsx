import { DUB_WORDMARK, PARTNERS_DOMAIN } from "@dub/utils";
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

export default function PartnerApplicationRejected({
  partner = {
    name: "John",
    email: "panic@thedis.co",
  },
  program = {
    name: "Acme",
    slug: "acme",
    supportEmail: "support@acme.com",
  },
  rejectionReason,
  additionalNotes,
  canReapplyImmediately = false,
}: {
  partner: {
    name: string;
    email: string;
  };
  program: {
    name: string;
    slug: string;
    supportEmail?: string | null;
  };
  rejectionReason?: string | null;
  additionalNotes?: string | null;
  canReapplyImmediately?: boolean;
}) {
  const reason = rejectionReason?.trim();
  const notes = additionalNotes?.trim();

  return (
    <Html>
      <Head />
      <Preview>
        {canReapplyImmediately
          ? `Program status update — you can submit a new application to ${program.name}`
          : `Program status update — your application to join ${program.name} was not approved`}
      </Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mb-8 mt-6">
              <Img src={DUB_WORDMARK} width="61" height="32" alt="dub" />
            </Section>

            <Heading className="mx-0 p-0 text-xl font-semibold text-neutral-900">
              Program status update
            </Heading>

            <Text className="mt-6 text-sm leading-6 text-neutral-600">
              Thank you for your interest in joining the{" "}
              <strong>{program.name}</strong> partner program. We appreciate the
              time it took to apply.
            </Text>

            <Text className="text-sm leading-6 text-neutral-600">
              After reviewing your application, we&apos;ve decided not to
              approve you at this time.
              {canReapplyImmediately ? (
                <>
                  {" "}
                  You&apos;re welcome to submit a new application whenever
                  you&apos;re ready.
                </>
              ) : (
                <> You will be able to re-apply in 30 days.</>
              )}
            </Text>

            {canReapplyImmediately ? (
              <Section className="my-8 mt-8">
                <Link
                  href={`${PARTNERS_DOMAIN}/apply/${program.slug}`}
                  className="rounded-lg bg-black px-6 py-3 text-center text-[12px] font-semibold text-white no-underline"
                >
                  Submit a new application
                </Link>
              </Section>
            ) : null}

            {reason ? (
              <Text className="text-sm leading-6 text-neutral-600">
                <strong>Reason for rejection:</strong>
                <br />
                {reason}
              </Text>
            ) : null}

            {notes ? (
              <Text className="whitespace-pre-line text-sm leading-6 text-neutral-600">
                <strong>Additional notes:</strong>
                <br />
                {notes}
              </Text>
            ) : null}

            {canReapplyImmediately ? null : (
              <Text className="text-sm leading-6 text-neutral-600">
                {program.supportEmail ? (
                  <>
                    If you think you were rejected in error, please contact the{" "}
                    <strong>{program.name}</strong> team at{" "}
                    <Link
                      href={`mailto:${program.supportEmail}`}
                      className="font-semibold text-neutral-700 underline underline-offset-2"
                    >
                      {program.supportEmail}
                    </Link>
                    .
                  </>
                ) : (
                  <>
                    If you think you were rejected in error, please contact the{" "}
                    <strong>{program.name}</strong> team directly.
                  </>
                )}
              </Text>
            )}

            <Footer email={partner.email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
