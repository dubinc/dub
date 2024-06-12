import { DUB_WORDMARK, getPlanDetails } from "@dub/utils";
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
  const planDetails = getPlanDetails(plan);
  return (
    <Html>
      <Head />
      <Preview>Thank you for upgrading to Dub.co {plan}!</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[500px] rounded border border-solid border-gray-200 px-10 py-5">
            <Section className="mt-8">
              <Img
                src={DUB_WORDMARK}
                height="40"
                alt="Dub"
                className="mx-auto my-0"
              />
            </Section>
            <Heading className="mx-0 my-7 p-0 text-center text-xl font-semibold text-black">
              Thank you for upgrading to Dub.co {plan}!
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
              personally reach out to thank you for upgrading to{" "}
              <Link
                href={planDetails.link}
                className="font-medium text-blue-600 no-underline"
              >
                Dub.co {plan}
              </Link>
              !
            </Text>
            <Text className="text-sm leading-6 text-black">
              As you might already know, we are a{" "}
              <Link
                href="https://d.to/mission"
                className="font-medium text-blue-600 no-underline"
              >
                100% bootstrapped
              </Link>{" "}
              and{" "}
              <Link
                href="https://d.to/github"
                className="font-medium text-blue-600 no-underline"
              >
                open-source
              </Link>{" "}
              business. Your support means the world to us and helps us continue
              to build and improve Dub.co.
            </Text>
            <Text className="text-sm leading-6 text-black">
              On the {plan} plan, you now have access to:
            </Text>
            {planDetails.features.map((feature) => (
              <Text className="ml-1 text-sm leading-4 text-black">
                ◆ {feature.text}
              </Text>
            ))}
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
