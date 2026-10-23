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

export default function DefaultPayoutMethodChanged({
  email = "panic@thedis.co",
  fromLabel = "Stablecoin",
  toLabel = "Bank Account",
}: {
  email: string;
  fromLabel: string;
  toLabel: string;
}) {
  const hasPreviousDefault = fromLabel !== "Not set";

  return (
    <Html>
      <Head />
      <Preview>{`Your default payout method is now ${toLabel}`}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mb-8 mt-6">
              <Img src={DUB_WORDMARK} width="65" height="32" alt="dub" />
            </Section>

            <Heading className="mx-0 mb-4 p-0 text-lg font-medium text-neutral-800">
              Default payout method updated
            </Heading>

            <Text className="mb-6 text-sm leading-6 text-neutral-600">
              {hasPreviousDefault ? (
                <>
                  Your default payout method changed from{" "}
                  <span className="font-medium text-neutral-900">
                    {fromLabel}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium text-neutral-900">
                    {toLabel}
                  </span>
                  . Future payouts will be sent to {toLabel}.
                </>
              ) : (
                <>
                  Your default payout method is now{" "}
                  <span className="font-medium text-neutral-900">
                    {toLabel}
                  </span>
                  . Future payouts will be sent there.
                </>
              )}
            </Text>

            <Section className="mb-6">
              <Link
                href="https://partners.dub.co/payouts?settings=true"
                className="box-border block w-full rounded-md bg-black px-0 py-3 text-center text-sm font-medium leading-none text-white no-underline"
              >
                View payout settings
              </Link>
            </Section>

            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
