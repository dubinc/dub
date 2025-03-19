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

export function PartnerApplicationReceived({
  email = "panic@thedis.co",
  partner = {
    id: "pn_1JPBEGP7EXF76CXT1W99VERW5",
    name: "John Doe",
    email: "panic@thedis.co",
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
  },
}: {
  email: string;
  partner: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    country: string | null;
    proposal: string;
    comments?: string;
  };
  program: {
    id: string;
  };
}) {
  const applicationUrl = `https://app.dub.co/acme/programs/${program.id}/partners?partnerId=${partner.id}`;

  return (
    <Html>
      <Head />
      <Preview>New partner application</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mb-8 mt-6">
              <Img src={DUB_WORDMARK} width="65" height="32" alt="dub" />
            </Section>

            <Heading className="mx-0 p-0 text-lg font-medium text-neutral-800">
              New partner application
            </Heading>

            <Text className="text-sm leading-6 text-neutral-600">
              You have a new pending application to review, view their
              application below and or{" "}
              <Link
                href={applicationUrl}
                className="text-neutral-600 underline underline-offset-4"
              >
                review on Dub
              </Link>
              .
            </Text>

            <Container className="mb-8 mt-10 rounded-lg border border-solid border-neutral-200">
              <Section className="p-4">
                <Container className="mb-4 w-full rounded-lg bg-[#f9fafb] p-6">
                  <div>
                    <div
                      style={{
                        position: "relative",
                        marginBottom: "16px",
                        display: "inline-block",
                      }}
                    >
                      <Img
                        src={partner.image ?? undefined}
                        width="64"
                        height="64"
                        alt={partner.name}
                        style={{ borderRadius: "9999px" }}
                      />

                      {partner.country && (
                        <Img
                          src={`https://flag.vercel.app/${partner.country}.svg`}
                          width="18"
                          height="18"
                          alt={partner.country}
                          style={{
                            position: "absolute",
                            bottom: "0",
                            right: "0",
                            borderRadius: "50%",
                            border: "2px solid white",
                          }}
                        />
                      )}
                    </div>
                    <div>
                      <Text className="m-0 p-0 text-2xl font-medium text-black">
                        {partner.name}
                      </Text>
                      <Text className="m-0 p-0 text-sm text-neutral-500">
                        {partner.email}
                      </Text>
                    </div>
                  </div>
                </Container>

                <Section className="mb-6">
                  <Text className="m-0 mb-2 p-0 text-base font-medium text-neutral-900">
                    How do you plan on promoting Cal.com
                  </Text>
                  <Text className="m-0 p-0 leading-6 text-neutral-600">
                    {partner.proposal}
                  </Text>
                </Section>

                {partner.comments && (
                  <Section className="mb-6">
                    <Text className="m-0 mb-2 p-0 text-base font-medium text-neutral-900">
                      Any additional question or comments{" "}
                      <span className="font-normal text-neutral-500">
                        (optional)
                      </span>
                    </Text>
                    <Text className="m-0 p-0 leading-6 text-neutral-600">
                      {partner.comments}
                    </Text>
                  </Section>
                )}

                <Section className="mt-8 text-center">
                  <Link
                    href={applicationUrl}
                    style={{
                      backgroundColor: "#111111",
                      borderRadius: "6px",
                      color: "#fff",
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      lineHeight: "100%",
                      padding: "16px 0",
                      textDecoration: "none",
                      textAlign: "center",
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  >
                    Review application on Dub
                  </Link>
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
