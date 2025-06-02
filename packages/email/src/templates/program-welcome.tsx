import {
  DUB_LOGO,
  DUB_THUMBNAIL,
  DUB_WORDMARK,
  getPrettyUrl,
} from "@dub/utils";
import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import { Footer } from "../components/footer";

export function ProgramWelcome({
  email = "panic@thedis.co",
  program = {
    name: "Acme",
    logo: DUB_LOGO,
    slug: "acme",
  },
}: {
  email: string;
  program: {
    name: string;
    logo: string | null;
    slug: string;
  };
}) {
  const programUrl = `https://partners.dub.co/${program.slug}`;

  return (
    <Html>
      <Head />
      <Preview>Congratulations on creating a program!</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] px-10 py-5">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>

            <Heading
              className="text-lg font-semibold leading-7 text-neutral-900"
              mt="28"
              as="h2"
            >
              Congratulations on creating a program!
            </Heading>

            <Text className="mt-5 text-sm leading-3 text-neutral-600">
              Your program{" "}
              <span className="font-semibold text-neutral-800">
                {program.name}
              </span>{" "}
              is created and ready to share with your partners.
            </Text>

            <Section className="rounded-xl border border-solid border-neutral-200 bg-neutral-50 px-6 py-4">
              <Row>
                <Column width={10}>
                  <Img
                    src={program.logo || DUB_THUMBNAIL}
                    alt={program.name}
                    height="32"
                    width="32"
                    className="mr-4 rounded-md"
                  />
                </Column>

                <Column>
                  <Text className="m-0 text-base text-sm font-semibold text-neutral-800">
                    {program.name}
                  </Text>

                  <Link
                    href={programUrl}
                    className="m-0 text-xs font-medium text-neutral-800 underline"
                  >
                    {getPrettyUrl(programUrl)}
                  </Link>
                </Column>
              </Row>
            </Section>

            <Heading
              className="mt-5 text-base font-semibold leading-6 text-neutral-900"
              as="h3"
            >
              Getting started
            </Heading>

            <Text className="text-sm leading-5 text-neutral-800">
              1. <span className="font-medium">Customize your dashboard</span> -
              Make it yours. <span>Update the logo and colors</span> to give
              your partners a fully branded experience.
            </Text>

            <Footer email={email} marketing />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export default ProgramWelcome;
