import { DUB_WORDMARK, OG_AVATAR_URL } from "@dub/utils";
import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import { Footer } from "../components/footer";

const MAX_DISPLAYED_MESSAGES = 3;

export default function NewMessageFromPartner({
  workspaceSlug = "acme",
  partner = {
    id: "pn_xxx",
    name: "Marvin Ta",
    image: null,
  },
  messages = [
    {
      text: "Am I eligible for that one bounty?",
      createdAt: new Date(Date.now() - 1000 * 60 * 5),
    },
  ],
  email = "panic@thedis.co",
}: {
  workspaceSlug: string;
  partner: {
    id: string;
    name: string;
    image: string | null;
  };
  messages: {
    text: string;
    createdAt: Date;
  }[];
  email: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>New message from {partner.name}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-8 max-w-[600px] px-8 py-8">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>

            <Section className="my-8">
              <Heading className="my-0 text-lg font-semibold text-black">
                {messages.length > 1
                  ? `${messages.length} new messages`
                  : "New message"}{" "}
                from {partner.name}
              </Heading>
              <Link
                className="text-[13px] font-medium text-neutral-500 underline"
                href={`https://app.dub.co/${workspaceSlug}/program/partners?partnerId=${partner.id}`}
              >
                View profile in Dub
              </Link>
            </Section>

            <Section className="rounded-xl border border-solid border-neutral-200 p-6">
              {messages.slice(0, MAX_DISPLAYED_MESSAGES).map((message, idx) => (
                <Row className={idx > 0 ? "pt-3" : ""}>
                  <Column className="align-bottom">
                    <Img
                      src={partner.image || `${OG_AVATAR_URL}${partner.name}`}
                      width="32"
                      height="32"
                      alt={partner.name}
                      className="rounded-full"
                    />
                  </Column>
                  <Column className="w-full pl-2">
                    <Text className="my-0 rounded-lg rounded-bl-none bg-neutral-100 px-4 py-2.5 text-sm leading-5 text-neutral-800">
                      {message.text}
                    </Text>
                  </Column>
                </Row>
              ))}
              {messages.length > MAX_DISPLAYED_MESSAGES && (
                <Text className="mt-4 text-center text-[12px] text-neutral-500">
                  {messages.length - MAX_DISPLAYED_MESSAGES} more messages from{" "}
                  {partner.name}
                </Text>
              )}
              <Link
                className="mt-4 block rounded-lg bg-neutral-900 px-6 py-3 text-center text-[13px] font-medium text-white no-underline"
                href={`https://app.dub.co/${workspaceSlug}/program/messages/${partner.id}`}
              >
                View in Dub
              </Link>
            </Section>

            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
