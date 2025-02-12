import { DUB_WORDMARK } from "@dub/utils";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

export function FeedbackEmail({
  email = "panic@thedis.co",
  feedback = "I love Dub!",
}: {
  email: string;
  feedback: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>New Feedback Received</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[500px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mt-8">
              <Img
                src={DUB_WORDMARK}
                height="40"
                alt="Dub"
                className="mx-auto my-0"
              />
            </Section>
            <Heading className="mx-0 my-7 p-0 text-center text-xl font-semibold text-black">
              New Feedback Received
            </Heading>
            <Text className="text-sm leading-6 text-black">
              New feedback from <span className="font-semibold">{email}</span>
            </Text>
            <Text className="text-sm leading-6 text-black">{feedback}</Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export default FeedbackEmail;
