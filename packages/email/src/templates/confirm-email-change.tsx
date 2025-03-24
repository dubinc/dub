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

export function ConfirmEmailChange({
  email = "panic@thedis.co",
  newEmail = "panic+1@thedis.co",
  confirmUrl = "https://dub.co/auth/confirm-email-change",
}: {
  email: string;
  newEmail: string;
  confirmUrl: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>Confirm your email address change</Preview>
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
              Confirm your email address change
            </Heading>
            <Text className="mx-auto text-sm leading-6">
              Follow this link to confirm the update to your email from{" "}
              <strong>{email}</strong> to <strong>{newEmail}</strong>.
            </Text>
            <Section className="my-8 text-center">
              <Link
                href={confirmUrl}
                className="rounded-full bg-black px-6 py-3 text-center text-[12px] font-semibold text-white no-underline"
              >
                <strong>Confirm email change</strong>
              </Link>
            </Section>
            <Text className="text-sm leading-6 text-black">
              If you did not request this change, this email can be safely
              ignored or{" "}
              <Link href={`${confirmUrl}?cancel=true`}>
                cancel this request
              </Link>
              .
            </Text>
            <Footer email={newEmail} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export default ConfirmEmailChange;
