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

export default function PartnerTremendousVerifyEmail({
  email = "panic@thedis.co",
  code = "123456",
  expiryMinutes = 5,
}: {
  email: string;
  code: string;
  expiryMinutes?: number;
}) {
  return (
    <Html>
      <Head />
      <Preview>Verify your gift card payout email</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>

            <Heading className="mx-0 my-7 p-0 text-xl font-medium text-black">
              Verify your gift card payout email
            </Heading>

            <Text className="mx-auto text-sm leading-6 text-neutral-600">
              Enter this code to verify your email address for gift card payouts
              via Dub Partners:
            </Text>

            <Section className="my-8 rounded-lg border border-solid border-neutral-200">
              <div className="mx-auto w-fit px-6 py-3 text-center font-mono text-2xl font-semibold tracking-[0.25em]">
                {code}
              </div>
            </Section>

            <Text className="text-sm leading-6 text-black">
              This code expires in {expiryMinutes} minutes.
            </Text>

            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
