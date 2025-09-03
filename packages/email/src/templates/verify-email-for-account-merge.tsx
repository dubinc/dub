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
import { Footer } from "../components/footer";

export default function VerifyEmailForAccountMerge({
  email = "panic@thedis.co",
  code = "123456",
  expiresInMinutes = 5,
}: {
  email: string;
  code: string;
  expiresInMinutes: number;
}) {
  return (
    <Html>
      <Head />
      <Preview>Confirm your email for account merging</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] px-10 py-5">
            <Section className="mb-8 flex items-center">
              <Img
                src={DUB_WORDMARK}
                height="32"
                alt="Dub"
                className="mr-auto"
              />
            </Section>

            <Heading className="mx-0 my-7 p-0 text-xl font-semibold text-black">
              Confirm your email for account merging
            </Heading>

            <Text className="mx-0 mb-8 text-base text-neutral-600">
              Use the code below to verify and continue merging your accounts
            </Text>

            <Section className="mb-8">
              <div className="mx-auto flex flex-col rounded-lg border border-solid border-neutral-200 bg-neutral-100 p-1 text-center">
                <div className="rounded-lg border border-solid border-neutral-200 bg-white px-6 py-6 text-center">
                  <span className="font-mono text-3xl font-semibold tracking-[0.25em]">
                    {code}
                  </span>
                </div>
                <div className="items-center py-1.5">
                  <span className="text-base text-sm text-neutral-500">
                    {email}
                  </span>
                </div>
              </div>
            </Section>

            <Text className="mb-2 text-sm text-neutral-600">
              This code expires in {expiresInMinutes} minutes.
            </Text>

            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
