import { DUB_WORDMARK, OG_AVATAR_URL } from "@dub/utils";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import { Footer } from "../components/footer";

export default function ReferralStatusUpdate({
  partner = {
    name: "John Doe",
    email: "john@example.com",
  },
  program = {
    name: "Acme",
    slug: "acme",
  },
  referral = {
    name: "Jane Smith",
    email: "jane@example.com",
    company: "Acme Corp",
    image: null,
  },
  status = "Qualified",
  notes,
}: {
  partner: { name: string; email: string };
  program: { name: string; slug: string };
  referral: {
    name: string;
    email: string;
    company: string;
    image: string | null;
  };
  status: string;
  notes?: string | null;
}) {
  return (
    <Html>
      <Head />
      <Preview>
        Your referral {referral.name} has been updated to {status}.
      </Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mb-8 mt-6">
              <Img src={DUB_WORDMARK} width="61" height="32" alt="dub" />
            </Section>

            <Heading className="mx-0 p-0 text-lg font-medium text-neutral-800">
              Referral status update
            </Heading>

            <Text className="text-sm leading-6 text-neutral-600">
              Your submitted referral has changed to <strong>{status}</strong>{" "}
              by <strong>{program.name}</strong>.
            </Text>

            {notes && (
              <>
                <Text className="mb-0 text-sm font-semibold leading-6 text-neutral-800">
                  Additional notes from {program.name}:
                </Text>
                <Text className="mt-1 text-sm leading-6 text-neutral-600">
                  {notes}
                </Text>
              </>
            )}

            <Container className="mb-8 mt-10 rounded-lg border border-solid border-neutral-200">
              <Section className="p-2">
                <Container className="w-full rounded-lg border border-solid border-neutral-100 bg-neutral-50 p-6">
                  <div>
                    <Img
                      src={
                        referral.image || `${OG_AVATAR_URL}${referral.email}`
                      }
                      width="48"
                      height="48"
                      alt={referral.name}
                      className="rounded-full"
                    />

                    <div>
                      <Text className="m-0 mt-3 p-0 text-lg font-medium text-neutral-900">
                        {referral.name}
                      </Text>
                      <table
                        cellPadding="0"
                        cellSpacing="0"
                        style={{ marginTop: "4px" }}
                      >
                        <tr>
                          <td
                            style={{
                              verticalAlign: "middle",
                              paddingRight: "6px",
                              lineHeight: 0,
                            }}
                          >
                            <Img
                              src="https://assets.dub.co/email-assets/icons/envelope.png"
                              width="14"
                              height="14"
                              className="opacity-75"
                              alt="envelope"
                            />
                          </td>
                          <td
                            style={{
                              verticalAlign: "middle",
                              fontSize: "14px",
                              color: "#737373",
                            }}
                          >
                            {referral.email}
                          </td>
                        </tr>
                      </table>
                      <table
                        cellPadding="0"
                        cellSpacing="0"
                        style={{ marginTop: "4px" }}
                      >
                        <tr>
                          <td
                            style={{
                              verticalAlign: "middle",
                              paddingRight: "6px",
                              lineHeight: 0,
                            }}
                          >
                            <Img
                              src="https://assets.dub.co/email-assets/icons/office-building.png"
                              width="14"
                              height="14"
                              alt="office building"
                              className="opacity-75"
                            />
                          </td>
                          <td
                            style={{
                              verticalAlign: "middle",
                              fontSize: "14px",
                              color: "#737373",
                            }}
                          >
                            {referral.company}
                          </td>
                        </tr>
                      </table>
                    </div>
                  </div>
                </Container>
              </Section>
            </Container>

            <Footer
              email={partner.email}
              notificationSettingsUrl="https://partners.dub.co/settings/notifications"
            />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
