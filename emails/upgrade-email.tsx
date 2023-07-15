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
import { DUB_LOGO } from "../lib/constants";
import Footer from "./components/footer";

export default function UpgradeEmail({
  name = "Brendon Urie",
  email = "panic@thedis.co",
  plan = "Pro",
}: {
  name: string | null;
  email: string;
  plan: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>Thank you for upgrading to Dub {plan}!</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[500px] rounded border border-solid border-gray-200 px-10 py-5">
            <Section className="mt-8">
              <Img
                src={DUB_LOGO}
                width="40"
                height="40"
                alt="Dub"
                className="mx-auto my-0"
              />
            </Section>
            <Heading className="mx-0 my-7 p-0 text-center text-xl font-semibold text-black">
              Thank you for upgrading to Dub {plan}!
            </Heading>
            <Section className="my-8">
              <Img
                src="https://public.blob.vercel-storage.com/kmKY9FhOzDRAX28c/thank-you-PCJDehD1yOJdagchd7TuDCI0JnXVo7.png"
                alt="Thank you"
                className="max-w-[500px]"
              />
            </Section>
            <Text className="text-sm leading-6 text-black">
              Hey{name && ` ${name}`}!
            </Text>
            <Text className="text-sm leading-6 text-black">
              My name is Steven, and I'm the founder of Dub. I wanted to
              personally reach out to thank you for upgrading to Dub {plan}!
            </Text>
            <Text className="text-sm leading-6 text-black">
              As you might already know, we are a{" "}
              <Link
                href="https://dub.sh/mission"
                className="font-medium text-blue-600 no-underline"
              >
                100% bootstrapped
              </Link>{" "}
              and{" "}
              <Link
                href="https://dub.sh/github"
                className="font-medium text-blue-600 no-underline"
              >
                open-source
              </Link>{" "}
              business. Your support means the world to us and helps us continue
              to build and improve Dub.
            </Text>
            <Text className="text-sm leading-6 text-black">
              On the {plan} plan, you now have access to:
            </Text>
            <Text className="ml-1 text-sm leading-4 text-black">
              ◆ {plan === "Enterprise" ? "Unlimited" : "Up to 50K"} link clicks
              per month
            </Text>
            <Text className="ml-1 text-sm leading-4 text-black">
              ◆ Custom branding for your QR codes
            </Text>
            <Text className="ml-1 text-sm leading-4 text-black">
              ◆ Redirect your root domain to the URL of your choice
            </Text>
            <Text className="ml-1 text-sm leading-4 text-black">
              ◆ Unlimited teammates
            </Text>
            <Text className="ml-1 text-sm leading-4 text-black">
              ◆ Unlimited link history
            </Text>
            <Text className="ml-1 text-sm leading-4 text-black">
              ◆ Unlimited tags
            </Text>
            <Text className="ml-1 text-sm leading-4 text-black">
              ◆ API access (coming soon)
            </Text>
            {plan === "Enterprise" && (
              <Text className="ml-1 text-sm leading-4 text-black">
                ◆ Priority support
              </Text>
            )}
            <Text className="text-sm leading-6 text-black">
              Let me know if you have any questions or feedback. I'm always
              happy to help!
            </Text>
            <Text className="text-sm font-light leading-6 text-gray-400">
              Steven from Dub
            </Text>

            <Footer email={email} marketing />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
