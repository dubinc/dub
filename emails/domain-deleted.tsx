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
import { _7QR_LOGO } from "../lib/constants";
import Footer from "./components/footer";

export default function DomainDeleted({
  email = "panic@thedis.co",
  domain = "7qr.sh",
  projectSlug = "7qr",
}: {
  email: string;
  domain: string;
  projectSlug: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>Domain Deleted</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[500px] rounded border border-solid border-gray-200 px-10 py-5">
            <Section className="mt-8">
              <Img
                src={_7QR_LOGO}
                width="40"
                height="40"
                alt="7qr"
                className="mx-auto my-0"
              />
            </Section>
            <Heading className="mx-0 my-7 p-0 text-center text-xl font-semibold text-black">
              Domain Deleted
            </Heading>
            <Text className="text-sm leading-6 text-black">
              Your domain <code className="text-purple-600">{domain}</code> for
              your 7qr project{" "}
              <Link
                href={`https://app.7qr.codes/${projectSlug}`}
                className="font-medium text-blue-600 no-underline"
              >
                {projectSlug}↗
              </Link>{" "}
              has been invalid for 30 days. As a result, it has been deleted
              from 7qr.
            </Text>
            <Text className="text-sm leading-6 text-black">
              If you would like to restore the domain, you can easily create it
              again on 7qr with the link below.
            </Text>
            <Section className="my-8 text-center">
              <Link
                className="rounded-full bg-black px-6 py-3 text-center text-[12px] font-semibold text-white no-underline"
                href={`https://app.7qr.codes/${projectSlug}/domains`}
              >
                Add a domain
              </Link>
            </Section>
            <Text className="text-sm leading-6 text-black">
              If you did not want to keep using this domain on 7qr anyway, you
              can simply ignore this email.
            </Text>
            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
