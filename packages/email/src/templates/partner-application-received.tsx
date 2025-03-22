import { DICEBEAR_AVATAR_URL, DUB_WORDMARK } from "@dub/utils";
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

export function PartnerApplicationReceived({
  email = "panic@thedis.co",
  partner = {
    id: "pn_1JPBEGP7EXF76CXT1W99VERW5",
    name: "John Doe",
    email: "john@example.com",
    image:
      "https://www.gravatar.com/avatar/2c7d99fe281ecd3bcd65ab915bac6dd5?s=250",
    country: "US",
    proposal:
      "This is a text field the applicant can fill out with details about the question asked above.",
    comments:
      "This is a text field the applicant can fill out with details about the question asked above.",
  },
  program = {
    id: "prog_CYCu7IMAapjkRpTnr8F1azjN",
    name: "Acme",
  },
}: {
  email: string;
  partner: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    country: string | null;
    proposal: string | null;
    comments: string | null;
  };
  program: {
    id: string;
    name: string;
  };
}) {
  const applicationUrl = `https://app.dub.co/acme/programs/${program.id}/partners?partnerId=${partner.id}`;

  return (
    <Html>
      <Head />
      <Preview>
        {partner.name} ({partner.email}) just applied to your partner program,{" "}
        {program.name}. Review their application below.
      </Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mb-8 mt-6">
              <Img src={DUB_WORDMARK} width="65" height="32" alt="dub" />
            </Section>

            <Heading className="mx-0 p-0 text-lg font-medium text-neutral-800">
              New partner application for {program.name}
            </Heading>

            <Text className="text-sm leading-6 text-neutral-600">
              You have a new pending application to review, view their
              application below or{" "}
              <Link
                href={applicationUrl}
                className="text-neutral-600 underline underline-offset-4"
              >
                review on Dub
              </Link>
              .
            </Text>

            <Container className="mb-8 mt-10 rounded-lg border border-solid border-neutral-200">
              <Section className="p-2">
                <Container className="mb-4 w-full rounded-lg border border-solid border-neutral-100 bg-neutral-50 p-6">
                  <div>
                    <div className="relative w-fit">
                      <Img
                        src={
                          partner.image ||
                          `${DICEBEAR_AVATAR_URL}${partner.name}`
                        }
                        width="48"
                        height="48"
                        alt={partner.name}
                        className="rounded-full"
                      />

                      {partner.country && (
                        <div className="absolute -right-1 top-0 overflow-hidden rounded-full bg-neutral-50 p-0.5">
                          <Img
                            src={`https://flag.vercel.app/m/${partner.country}.svg`}
                            width="12"
                            height="12"
                            alt={partner.country}
                            className="size-3 rounded-full"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <Text className="m-0 p-0 text-lg font-medium text-neutral-900">
                        {partner.name}
                      </Text>
                      <Text className="m-0 p-0 text-sm text-neutral-500">
                        {partner.email}
                      </Text>
                    </div>
                  </div>
                </Container>

                <Section className="p-4">
                  <Section className="mb-6">
                    <Text className="m-0 mb-2 p-0 text-base font-medium text-neutral-900">
                      How do you plan on promoting {program.name}
                    </Text>
                    <Text className="m-0 p-0 leading-6 text-neutral-600">
                      {partner.proposal ?? "No proposal provided."}
                    </Text>
                  </Section>

                  <Section className="mb-6">
                    <Text className="m-0 mb-2 p-0 text-base font-medium text-neutral-900">
                      Any additional question or comments{" "}
                      <span className="font-normal text-neutral-500">
                        (optional)
                      </span>
                    </Text>
                    <Text className="m-0 p-0 leading-6 text-neutral-600">
                      {partner.comments ?? "No comments provided."}
                    </Text>
                  </Section>

                  <Section className="mt-8 text-center">
                    <Link
                      href={applicationUrl}
                      className="box-border block w-full rounded-md bg-black px-0 py-4 text-center text-sm font-medium leading-none text-white no-underline"
                    >
                      Review application on Dub
                    </Link>
                  </Section>
                </Section>
              </Section>
            </Container>

            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export default PartnerApplicationReceived;
