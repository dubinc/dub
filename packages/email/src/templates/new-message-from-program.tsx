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

export default function NewMessageFromProgram({
  program = {
    name: "Acme",
    slug: "acme",
    logo: "https://assets.dub.co/misc/acme-logo.png",
  },
  messages = [
    {
      text: "You are for sure eligible. We'll most likely make those changes within the next day or two. Stay tuned.",
      createdAt: new Date(Date.now() - 1000 * 60 * 5),
      user: {
        name: "Brendan Urie",
        image: null,
      },
    },
    {
      text: "You're all set now!",
      createdAt: new Date(),
      user: {
        name: "Brendan Urie",
        image: null,
      },
    },
  ],
  email = "panic@thedis.co",
}: {
  program: {
    name: string;
    slug: string;
    logo: string | null;
  };
  messages: {
    text: string;
    createdAt: Date;
    user: {
      name: string;
      image: string | null;
    };
  }[];
  email: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>New message from {program.name}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-8 max-w-[600px] px-8 py-8">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>

            <Section className="my-8">
              <div className="flex items-center">
                <Img
                  src={program.logo || "https://assets.dub.co/logo.png"}
                  width="32"
                  height="32"
                  alt={program.name}
                  className="rounded-full"
                />
                <Section className="ml-4">
                  <Heading className="my-0 text-lg font-semibold text-black">
                    {program.name} sent{" "}
                    {messages.length > 1
                      ? `${messages.length} messages`
                      : "a message"}
                  </Heading>
                  <Link
                    className="text-[13px] font-medium text-neutral-500 underline"
                    href={`https://partners.dub.co/programs/${program.slug}`}
                  >
                    View program in Dub
                  </Link>
                </Section>
              </div>
            </Section>

            <Section className="rounded-xl border border-solid border-neutral-200 p-6">
              {messages.slice(0, MAX_DISPLAYED_MESSAGES).map((message, idx) => (
                <Row className={idx > 0 ? "pt-3" : ""}>
                  <Column className="align-bottom">
                    <Img
                      src={
                        message.user.image ||
                        `${OG_AVATAR_URL}${message.user.name}`
                      }
                      width="32"
                      height="32"
                      alt={message.user.name}
                      className="rounded-full"
                    />
                  </Column>
                  <Column className="w-full pl-2">
                    <Text className="my-0 text-[12px] font-medium text-neutral-500">
                      <span className="text-neutral-700">
                        {message.user.name}
                      </span>
                      &nbsp;&nbsp;
                      {message.createdAt.toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "numeric",
                      })}
                    </Text>
                    <Text
                      className="my-0 rounded-lg rounded-bl-none bg-neutral-100 px-4 py-2.5 text-sm leading-5 text-neutral-800"
                      style={{ whiteSpace: "pre-wrap" }}
                    >
                      {message.text}
                    </Text>
                  </Column>
                </Row>
              ))}
              {messages.length > MAX_DISPLAYED_MESSAGES && (
                <Text className="mt-4 text-center text-[12px] text-neutral-500">
                  {messages.length - MAX_DISPLAYED_MESSAGES} more messages from{" "}
                  {program.name}
                </Text>
              )}
              <Link
                className="mt-4 block rounded-lg bg-neutral-900 px-6 py-3 text-center text-[13px] font-medium text-white no-underline"
                href={`https://partners.dub.co/messages/${program.slug}`}
              >
                Reply in Dub
              </Link>
            </Section>

            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
