import {
  Body,
  Link,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import * as React from "react";

export default function UpgradeEmail({
  name = "Brendon Urie",
  email = "panic@thedisco",
}: {
  name: string | null;
  email: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>Thank you for upgrading!</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[500px] rounded border border-solid border-gray-200 px-10 py-5">
            <Section className="mt-8">
              <Img
                src="https://dub.sh/_static/logo.png"
                width="40"
                height="40"
                alt="Dub"
                className="mx-auto my-0"
              />
            </Section>
            <Heading className="mx-0 my-7 p-0 text-center text-xl font-semibold text-black">
              Thank you for upgrading!
            </Heading>
            <Section className="my-8">
              <Img
                src="https://dub.sh/_static/thumbnail.png"
                alt="Dub"
                className="max-w-[500px]"
              />
            </Section>
            <Text className="text-sm leading-6 text-black">
              Thanks for signing up{name && `, ${name}`}!
            </Text>
            <Text className="text-sm leading-6 text-black">
              My name is Steven, and I'm the creator of Dub - the link
              management tool for modern marketing teams. I'm excited to have
              you on board!
            </Text>
            <Text className="text-sm leading-6 text-black">
              Here are a few things you can do:
            </Text>
            <Text className="ml-1 text-sm leading-4 text-black">
              ◆ Create a{" "}
              <a
                href="https://app.dub.sh/links"
                className="font-medium text-blue-600 no-underline"
              >
                Dub.sh short link
              </a>
            </Text>
            <Text className="ml-1 text-sm leading-4 text-black">
              ◆ Create a{" "}
              <a
                href="https://app.dub.sh"
                className="font-medium text-blue-600 no-underline"
              >
                new project
              </a>{" "}
              and add your custom domain
            </Text>
            <Text className="ml-1 text-sm leading-4 text-black">
              ◆ Follow us on{" "}
              <a
                href="https://twitter.com/dubdotsh"
                className="font-medium text-blue-600 no-underline"
              >
                Twitter
              </a>
            </Text>
            <Text className="text-sm leading-6 text-black">
              Let me know if you have any questions or feedback. I'm always
              happy to help!
            </Text>
            <Text className="text-sm font-light leading-6 text-gray-400">
              Steven from Dub
            </Text>

            <Hr className="mx-0 my-6 w-full border border-gray-200" />
            <Text className="text-[12px] leading-6 text-gray-500">
              This invitation was intended for{" "}
              <span className="text-black">{email}</span>. If you were not
              expecting this invitation, you can ignore this email. If you are
              concerned about your account's safety, please reply to this email
              to get in touch with us.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
