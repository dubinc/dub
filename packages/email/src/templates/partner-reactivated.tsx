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

export default function PartnerReactivated({
  partner = {
    name: "John",
    email: "panic@thedis.co",
  },
  program = {
    name: "Acme",
    slug: "acme",
  },
}: {
  partner: {
    name: string;
    email: string;
  };
  program: {
    name: string;
    slug: string;
  };
}) {
  return (
    <Html>
      <Head />
      <Preview>
        {`${program.name} has reactivated their partner program.`}
      </Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mb-8 mt-6">
              <Img src={DUB_WORDMARK} width="61" height="32" alt="dub" />
            </Section>

            <Heading className="mx-0 p-0 text-lg font-medium text-neutral-600">
              {program.name} has reactivated their program
            </Heading>

            <Text className="text-sm leading-6 text-neutral-600">
              Great news! {program.name} has reactivated their partner program.
            </Text>

            <Text className="text-sm leading-6 text-neutral-600">
              Your referral links are now active again and will resume
              generating commissions. No action is needed on your end.
            </Text>

            <Text className="text-sm leading-6 text-neutral-600">
              You can view your dashboard and links on{" "}
              <Link
                href={`https://partners.dub.co/programs/${program.slug}`}
                className="font-semibold text-neutral-700 underline underline-offset-2"
              >
                partners.dub.co ↗
              </Link>
              .
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

            <Footer email={partner.email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
