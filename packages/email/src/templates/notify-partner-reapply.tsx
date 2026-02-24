import { DUB_WORDMARK, OG_AVATAR_URL } from "@dub/utils";
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

export default function NotifyPartnerReapply({
  partner = {
    name: "John Doe",
    email: "john@example.com",
  },
  programs = [
    {
      name: "Acme",
      slug: "acme",
      logo: "https://dubassets.com/programs/prog_CYCu7IMAapjkRpTnr8F1azjN/logo_HPEaC8P",
    },
    {
      name: "Dub",
      slug: "dub",
      logo: "https://dubassets.com/programs/prog_d8pl69xXCv4AoHNT281pHQdo/logo_TMLMTHs",
    },
  ],
}: {
  partner: {
    name?: string | null;
    email: string;
  };
  programs: {
    name: string;
    slug: string;
    logo?: string | null;
  }[];
}) {
  return (
    <Html>
      <Head />
      <Preview>
        There was a problem with your applications to these programs. Please
        reapply.
      </Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mb-8 mt-6">
              <Img src={DUB_WORDMARK} width="65" height="32" alt="dub" />
            </Section>

            <Heading className="mx-0 p-0 text-lg font-medium text-neutral-800">
              Please resubmit your applications to these programs
            </Heading>

            <Text className="text-sm leading-6 text-neutral-600">
              Hi {partner.name ? partner.name.split(" ")[0] : "there"}! Due to a
              technical issue, your applications to the following programs were
              not submitted correctly:
            </Text>

            <Section className="text-base">
              {programs.map((program) => (
                <Row key={program.slug} className="h-10">
                  <Column>
                    <Row>
                      <Column width="32">
                        <Img
                          src={
                            program.logo || `${OG_AVATAR_URL}${program.name}`
                          }
                          width="20"
                          height="20"
                          alt="Program logo"
                          className="rounded-full border border-neutral-200"
                        />
                      </Column>
                      <Column className="text-sm font-semibold text-neutral-800">
                        {program.name}
                      </Column>
                    </Row>
                  </Column>
                  <Column className="text-right text-sm">
                    <Link
                      href={`https://partners.dub.co/programs/marketplace/${program.slug}`}
                      className="rounded-lg border border-neutral-200 px-2 py-1 text-sm font-medium text-neutral-600 no-underline"
                    >
                      Reapply
                    </Link>
                  </Column>
                </Row>
              ))}
            </Section>

            <Text className="text-sm leading-6 text-neutral-600">
              The issue has been fixed, but you will need to resubmit your
              applications to these programs. We truly apologize for the
              inconvenience.
            </Text>

            <Footer email={partner.email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
