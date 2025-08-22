import { currencyFormatter, DUB_WORDMARK, formatDate } from "@dub/utils";
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

export default function DomainRenewalReminder({
  email = "panic@thedis.co",
  workspace = {
    slug: "acme",
  },
  domain = {
    slug: "getacme.link",
    renewalFee: 1200,
    expiresAt: new Date("2025-08-19"),
    reminderWindow: 30,
    chargeAt: new Date("2025-08-05"),
    chargeAtInText: "2 weeks",
  },
}: {
  email: string;
  workspace: {
    slug: string;
  };
  domain: {
    slug: string;
    expiresAt: Date;
    renewalFee: number;
    chargeAt: Date;
    reminderWindow: number;
    chargeAtInText: string;
  };
}) {
  return (
    <Html>
      <Head />
      <Preview>Domain renewal reminder</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] px-5 py-5">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>

            <Heading className="mx-0 mb-5 mt-10 p-0 text-lg font-semibold text-neutral-800">
              Domain renewal reminder
            </Heading>

            <Text className="text-sm leading-6 text-neutral-600">
              The domain{" "}
              <Link
                href={`https://${domain.slug}`}
                className="font-semibold text-black underline"
              >
                {domain.slug}
              </Link>{" "}
              will renew in {domain.reminderWindow} days on{" "}
              <span className="font-semibold text-black">
                {formatDate(domain.expiresAt)}
              </span>
              . We will attempt to charge your card on file{" "}
              {currencyFormatter(domain.renewalFee / 100)} in{" "}
              {domain.chargeAtInText} on {formatDate(domain.chargeAt)}.
            </Text>

            <Text className="text-sm leading-6 text-neutral-600">
              If you don't want to renew your domain, you can turn off
              auto-renewal in your{" "}
              <Link
                href={`https://app.dub.co/${workspace.slug}/links/domains`}
                className="font-semibold text-black underline"
              >
                domain settings page
              </Link>
              .
            </Text>

            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
