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

export function PartnerBanned({
  partner = {
    name: "John",
    email: "panic@thedis.co",
  },
  program = {
    name: "Acme",
    supportEmail: "support@acme.com",
  },
  bannedReason = "violating our terms of service",
}: {
  partner: {
    name: string;
    email: string;
  };
  program: {
    name: string;
    supportEmail: string;
  };
  bannedReason: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>
        You've been banned from the {program.name} Partner Program for{" "}
        {bannedReason}
      </Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mb-8 mt-6">
              <Img src={DUB_WORDMARK} width="65" height="32" alt="dub" />
            </Section>

            <Heading className="mx-0 p-0 text-lg font-medium text-neutral-600">
              Hello {partner.name},
            </Heading>

            <Text className="text-sm leading-6 text-neutral-600">
              You've been banned from the {program.name} Partner Program for{" "}
              <strong>{bannedReason}</strong>.
            </Text>

            <Text className="text-sm leading-6 text-neutral-600">
              All your links have been deactivated, and your pending commissions
              have been canceled. You cannot apply to the {program.name} Partner
              Program again.
            </Text>

            <Text className="text-sm leading-6 text-neutral-600">
              If you wish to appeal this ban, please reach out to{" "}
              <Link
                href={`mailto:${program.supportEmail}`}
                className="text-neutral-600 underline underline-offset-4"
              >
                {program.supportEmail}
              </Link>
              .
            </Text>

            <Footer email={partner.email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export default PartnerBanned;
