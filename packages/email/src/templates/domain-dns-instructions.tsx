import { DUB_WORDMARK } from "@dub/utils";
import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import { Footer } from "../components/footer";

type DnsRecord = {
  type: string;
  name: string;
  value: string;
};

export default function DomainDnsInstructions({
  email = "admin@acme.com",
  domain = "go.acme.com",
  records = [
    { type: "A", name: "@", value: "76.76.21.21" },
    { type: "TXT", name: "_vercel", value: "vc-domain-verify=abc123" },
  ],
  senderEmail = "someone@example.com",
}: {
  email: string;
  domain: string;
  records: DnsRecord[];
  senderEmail: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>DNS instructions for {domain}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>
            <Heading className="mx-0 my-7 p-0 text-lg font-medium text-black">
              DNS configuration for {domain}
            </Heading>
            <Text className="text-sm leading-6 text-black">
              <strong>{senderEmail}</strong> forwarded you the DNS records
              needed to connect <strong>{domain}</strong> to Dub. Add the
              records below to your DNS provider to complete the setup.
            </Text>

            {/* header row */}
            <Section className="mt-6 rounded-lg bg-neutral-100 px-4 py-3">
              <Row>
                <Column className="w-16">
                  <Text className="m-0 text-xs font-semibold text-neutral-500">
                    TYPE
                  </Text>
                </Column>
                <Column className="w-24">
                  <Text className="m-0 text-xs font-semibold text-neutral-500">
                    NAME
                  </Text>
                </Column>
                <Column>
                  <Text className="m-0 text-xs font-semibold text-neutral-500">
                    VALUE
                  </Text>
                </Column>
              </Row>

              {records.map((record, idx) => (
                <Row key={idx} className="border-t border-neutral-200">
                  <Column className="w-16 py-2">
                    <Text className="m-0 font-mono text-xs text-black">
                      {record.type}
                    </Text>
                  </Column>
                  <Column className="w-24 py-2">
                    <Text className="m-0 font-mono text-xs text-black">
                      {record.name}
                    </Text>
                  </Column>
                  <Column className="py-2">
                    <Text className="m-0 break-all font-mono text-xs text-black">
                      {record.value}
                    </Text>
                  </Column>
                </Row>
              ))}
            </Section>

            <Text className="text-sm leading-6 text-neutral-500">
              DNS changes can take up to 24-48 hours to propagate fully.
            </Text>

            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
