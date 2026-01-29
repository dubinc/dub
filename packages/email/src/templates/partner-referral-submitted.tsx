import { DUB_WORDMARK, OG_AVATAR_URL } from "@dub/utils";
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

export default function PartnerReferralSubmitted({
  email = "panic@thedis.co",
  workspace = {
    slug: "acme",
  },
  referral = {
    id: "ref_1234567890",
    name: "Jane Smith",
    email: "jane@example.com",
    company: "Acme Corp",
    image: null,
    formData: [
      {
        label: "How did you meet this referral?",
        value: "Met at a conference last month.",
      },
      {
        label: "Expected deal size",
        value: "$50,000",
      },
    ],
  },
}: {
  email: string;
  workspace: { slug: string };
  referral: {
    id: string;
    name: string;
    email: string;
    company: string;
    image: string | null;
    formData?: { label: string; value: unknown }[] | null;
  };
}) {
  const referralUrl = `https://app.dub.co/${workspace.slug}/program/customers/referrals?referralId=${referral.id}`;

  return (
    <Html>
      <Head />
      <Preview>
        New partner referral from {referral.name} ({referral.email}) at{" "}
        {referral.company}.
      </Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mb-8 mt-6">
              <Img src={DUB_WORDMARK} width="61" height="32" alt="dub" />
            </Section>

            <Heading className="mx-0 p-0 text-lg font-medium text-neutral-800">
              New partner referral
            </Heading>

            <Text className="text-sm leading-6 text-neutral-600">
              You have a new partner referral to review, view the{" "}
              <Link
                href={referralUrl}
                className="text-neutral-600 underline underline-offset-4"
              >
                full details on Dub
              </Link>
              .
            </Text>

            <Container className="mt-10 rounded-lg border border-solid border-neutral-200">
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
                              className="opacity-75"
                              alt="office building"
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

                {referral.formData && referral.formData.length > 0 && (
                  <Section className="px-4 pt-4">
                    {referral.formData.map((field) => (
                      <Section key={field.label} className="mb-4">
                        <Text className="m-0 mb-2 p-0 text-base font-medium text-neutral-900">
                          {field.label}
                        </Text>
                        <Text className="m-0 p-0 leading-6 text-neutral-600">
                          {String(field.value)}
                        </Text>
                      </Section>
                    ))}
                  </Section>
                )}
              </Section>
            </Container>

            <Section className="mb-8 mt-8 text-center">
              <Link
                href={referralUrl}
                className="box-border block w-full rounded-lg bg-black px-0 py-4 text-center text-sm font-semibold leading-none text-white no-underline"
              >
                Review on Dub
              </Link>
            </Section>

            <Footer
              email={email}
              notificationSettingsUrl={`https://app.dub.co/${workspace.slug}/settings/notifications`}
            />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
