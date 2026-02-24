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

export default function PartnerDeactivated({
  partner = {
    name: "John",
    email: "panic@thedis.co",
  },
  program = {
    name: "Acme",
    slug: "acme",
  },
  deactivatedReason,
  programDeactivated,
}: {
  partner: {
    name: string;
    email: string;
  };
  program: {
    name: string;
    slug: string;
  };
  deactivatedReason?: string;
  programDeactivated?: boolean;
}) {
  return (
    <Html>
      <Head />
      <Preview>
        {programDeactivated
          ? `${program.name} has deactivated their partner program.`
          : `${program.name} has deactivated your partnership with their program.`}
      </Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mb-8 mt-6">
              <Img src={DUB_WORDMARK} width="61" height="32" alt="dub" />
            </Section>

            <Heading className="mx-0 p-0 text-lg font-medium text-neutral-600">
              {program.name} has deactivated{" "}
              {programDeactivated ? "their program" : "your partnership"}
            </Heading>

            {programDeactivated ? (
              <>
                <Text className="text-sm leading-6 text-neutral-600">
                  We're reaching out to let you know that {program.name} has
                  deactivated their partner program.
                </Text>

                <Text className="text-sm leading-6 text-neutral-600">
                  As a result, any {program.name} links you were sharing are now
                  disabled and will no longer generate new commissions.
                </Text>

                <Text className="text-sm leading-6 text-neutral-600">
                  We recommend removing or replacing any {program.name} links
                  you currently have live, since they will no longer be eligible
                  for future commissions.
                </Text>

                <Text className="text-sm leading-6 text-neutral-600">
                  If you have questions about the program or your payouts,
                  please{" "}
                  <Link
                    href={`https://partners.dub.co/messages/${program.slug}`}
                    className="font-semibold text-neutral-700 underline underline-offset-2"
                  >
                    reach out to the {program.name} team ↗
                  </Link>
                  .
                </Text>
              </>
            ) : (
              <>
                <Text className="text-sm leading-6 text-neutral-600">
                  Hello {partner.name}, {program.name} has deactivated your
                  partnership with their program
                  {deactivatedReason ? (
                    <span className="font-bold">{` ${deactivatedReason}`}</span>
                  ) : (
                    ""
                  )}
                  .
                </Text>

                <Text className="text-sm leading-6 text-neutral-600">
                  All your links have been disabled, but your pending
                  commissions and payouts will remain until they are approved
                  and paid out by the {program.name} team.
                </Text>

                <Text className="text-sm leading-6 text-neutral-600">
                  If you have any questions, please{" "}
                  <Link
                    href={`https://partners.dub.co/messages/${program.slug}`}
                    className="font-semibold text-neutral-700 underline underline-offset-2"
                  >
                    reach out to the {program.name} team ↗
                  </Link>
                  .
                </Text>
              </>
            )}

            <Footer email={partner.email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
