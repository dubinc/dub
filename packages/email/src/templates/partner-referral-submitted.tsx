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

const ENVELOPE_ICON = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 18 18'%3E%3Cg fill='%23737373'%3E%3Cpath d='M1.75,5.75l6.767,3.733c.301,.166,.665,.166,.966,0l6.767-3.733' fill='none' stroke='%23737373' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5'/%3E%3Crect height='11.5' width='14.5' fill='none' rx='2' ry='2' stroke='%23737373' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' x='1.75' y='3.25'/%3E%3C/g%3E%3C/svg%3E`;

const OFFICE_BUILDING_ICON = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 18 18'%3E%3Cg fill='%23737373'%3E%3Cpath d='M7.75,16.25V7.75c0-.552,.448-1,1-1h5.5c.552,0,1,.448,1,1v8.5' fill='none' stroke='%23737373' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5'/%3E%3Cpath d='M2.75,16.25V4.412c0-.402,.24-.765,.61-.921L7.86,1.588c.659-.279,1.39,.205,1.39,.921v1.741' fill='none' stroke='%23737373' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5'/%3E%3Cline fill='none' stroke='%23737373' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' x1='1.75' x2='16.25' y1='16.25' y2='16.25'/%3E%3Cline fill='none' stroke='%23737373' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' x1='10.25' x2='10.25' y1='10.25' y2='9.75'/%3E%3Cline fill='none' stroke='%23737373' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' x1='12.75' x2='12.75' y1='10.25' y2='9.75'/%3E%3Cline fill='none' stroke='%23737373' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' x1='10.25' x2='10.25' y1='13.25' y2='12.75'/%3E%3Cline fill='none' stroke='%23737373' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' x1='12.75' x2='12.75' y1='13.25' y2='12.75'/%3E%3C/g%3E%3C/svg%3E`;

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
                        referral.image ||
                        `${OG_AVATAR_URL}${referral.email}`
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
                      <table cellPadding="0" cellSpacing="0" style={{ marginTop: "4px" }}>
                        <tr>
                          <td style={{ verticalAlign: "middle", paddingRight: "6px", lineHeight: 0 }}>
                            <Img src={ENVELOPE_ICON} width="14" height="14" alt="" />
                          </td>
                          <td style={{ verticalAlign: "middle", fontSize: "14px", color: "#737373" }}>
                            {referral.email}
                          </td>
                        </tr>
                      </table>
                      <table cellPadding="0" cellSpacing="0" style={{ marginTop: "4px" }}>
                        <tr>
                          <td style={{ verticalAlign: "middle", paddingRight: "6px", lineHeight: 0 }}>
                            <Img src={OFFICE_BUILDING_ICON} width="14" height="14" alt="" />
                          </td>
                          <td style={{ verticalAlign: "middle", fontSize: "14px", color: "#737373" }}>
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
