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

export default function ProgramApplicationReminder({
  email = "panic@thedis.co",
  program = {
    name: "Acme",
    slug: "acme",
  },
}: {
  email: string;
  program: {
    name: string;
    slug: string;
  };
}) {
  return (
    <Html>
      <Head />
      <Preview>
        Your application to {program.name} has been saved, but you still need to
        create your Dub Partner account to complete your application.
      </Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mb-8 mt-6">
              <Img src={DUB_WORDMARK} width="65" height="32" alt="dub" />
            </Section>

            <Heading className="mx-0 p-0 text-lg font-medium text-neutral-800">
              You're almost ready!
            </Heading>

            <Text className="text-sm leading-6 text-neutral-600">
              Your application to <b>{program.name}'s Program</b> has been
              saved, but you still need to create your Dub Partners account to
              complete your application.
              <br />
              <br />
              Once you create your Dub Partners account, your application will
              be submitted to <b>{program.name}</b> and you'll be able to start
              earning rewards for referring customers.
            </Text>

            <Section className="mt-8 text-center">
              <Link
                href={`https://partners.dub.co/${program.slug}/register`}
                className="box-border block w-full rounded-md bg-black px-0 py-4 text-center text-sm font-medium leading-none text-white no-underline"
              >
                Create your Dub Partners account
              </Link>
            </Section>

            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
