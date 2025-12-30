import { DUB_WORDMARK } from "@dub/utils";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import { Footer } from "../components/footer";

export default function WelcomeEmail({
  name = "Brendon Urie",
  email = "panic@thedis.co",
  unsubscribeUrl,
}: {
  name: string | null;
  email: string;
  unsubscribeUrl: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to Dub</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>
            <Heading className="mx-0 my-7 p-0 text-xl font-semibold text-black">
              Welcome {name || "to Dub"}!
            </Heading>
            <Text className="mb-8 text-sm leading-6 text-gray-600">
              Thank you for signing up for Dub! You can now start creating short
              links, track conversions, and explore our API.
            </Text>

            <Hr />

            <Heading className="mx-0 my-6 p-0 text-lg font-semibold text-black">
              Getting started
            </Heading>

            <Text className="mb-4 text-sm leading-6 text-gray-600">
              <strong className="font-medium text-black">
                1. Set up your domain
              </strong>
              :{" "}
              <Link
                href="https://dub.co/help/article/how-to-add-custom-domain"
                className="font-semibold text-black underline underline-offset-4"
              >
                Add a custom domain
              </Link>{" "}
              or{" "}
              <Link
                href="https://dub.co/help/article/free-dot-link-domain"
                className="font-semibold text-black underline underline-offset-4"
              >
                claim a free .link domain
              </Link>{" "}
              and start creating your short links.
            </Text>

            <Text className="mb-4 text-sm leading-6 text-gray-600">
              <strong className="font-medium text-black">
                2. View analytics
              </strong>
              : Monitor{" "}
              <Link
                href="https://dub.co/help/article/dub-analytics"
                className="font-semibold text-black underline underline-offset-4"
              >
                click data
              </Link>{" "}
              in real time to see what's working.
            </Text>

            <Text className="mb-4 text-sm leading-6 text-gray-600">
              <strong className="font-medium text-black">
                3. Track conversions
              </strong>
              : Measure how your links convert to signups and sales with our
              built-in{" "}
              <Link
                href="https://dub.co/help/article/dub-conversions"
                className="font-semibold text-black underline underline-offset-4"
              >
                conversion tracking API
              </Link>
              .
            </Text>

            <Text className="mb-8 text-sm leading-6 text-gray-600">
              <strong className="font-medium text-black">
                4. Explore the API
              </strong>
              :{" "}
              <Link
                href="https://dub.co/docs/introduction"
                className="font-semibold text-black underline underline-offset-4"
              >
                Check out our docs
              </Link>{" "}
              for programmatic link creation.
            </Text>

            <Section className="mb-8">
              <Link
                className="rounded-lg bg-black px-6 py-3 text-center text-[12px] font-semibold text-white no-underline"
                href="https://app.dub.co"
              >
                Go to your dashboard
              </Link>
            </Section>

            <Footer email={email} marketing unsubscribeUrl={unsubscribeUrl} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
