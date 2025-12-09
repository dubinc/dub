import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

export default function CampaignEmail({
  program = {
    name: "Acme",
    slug: "acme",
    logo: "https://assets.dub.co/misc/acme-logo.png",
    messagingEnabledAt: new Date(),
  },
  campaign = {
    type: "marketing",
    preview: "Test Preview",
    body: `<p xmlns="http://www.w3.org/1999/xhtml">Hi <span class="px-1 py-0.5 bg-blue-100 text-blue-700 rounded font-semibold" data-type="mention" data-id="PartnerName">{{PartnerName}}</span>,</p><p xmlns="http://www.w3.org/1999/xhtml">Thrilled to have you officially join the Acme Ambassador Program!</p><p xmlns="http://www.w3.org/1999/xhtml">As a Acme Ambassador, you're joining the front line of change. You're freeing people from broken healthcare and giving them back control of their health.</p><p xmlns="http://www.w3.org/1999/xhtml">Your 3 quick steps to get started:</p><ol xmlns="http://www.w3.org/1999/xhtml"><li><p>Activate your membership with your 50% off code: <strong>ACME50OFF</strong></p></li><li><p><a target="_blank" rel="noopener noreferrer nofollow" href="https://partners.dub.co/programs/acme">Open your dashboard</a> and copy your referral link</p></li><li><p>Share Acme with your loved ones! Use our <a target="_blank" rel="noopener noreferrer nofollow" href="http://acme.dub.sh">Ambassador Hub</a> for all the information you need like message templates, images, and information about Acme.</p></li></ol><p xmlns="http://www.w3.org/1999/xhtml">And a bonus: make your first referral within 7 days and you'll also receive a limited-edition Acme hoodie.</p><img xmlns="http://www.w3.org/1999/xhtml" src="https://dubassets.com/programs/prog_CYCu7IMAapjkRpTnr8F1azjN/lander/image_JjbkiaM" style="max-width: 100%; height: auto; margin: 12px auto;" /><p xmlns="http://www.w3.org/1999/xhtml">We're here with you every step of the way.</p><p xmlns="http://www.w3.org/1999/xhtml">To your health,</p><p xmlns="http://www.w3.org/1999/xhtml">The Acme team</p>`,
  },
}: {
  program?: {
    name: string;
    slug: string;
    logo: string | null;
    messagingEnabledAt?: Date | null | undefined;
  };
  campaign?: {
    type: "transactional" | "marketing";
    preview?: string | null;
    body: string;
  };
}) {
  const styledHtml = `
    <div style="max-width: 100%; overflow: hidden;">
      ${campaign.body}
    </div>
  `;

  return (
    <Html>
      <Head />
      {campaign.preview && <Preview>{campaign.preview}</Preview>}
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] px-10 py-5">
            <Section className="my-8">
              <div className="flex items-center">
                <Img
                  src={program.logo || "https://assets.dub.co/logo.png"}
                  width="32"
                  height="32"
                  alt={program.name}
                  className="rounded-full"
                />
                <Section className="ml-4">
                  <Heading className="my-0 text-lg font-semibold text-black">
                    {program.name}
                  </Heading>
                  <Link
                    className="text-[13px] font-medium text-neutral-500 underline"
                    href={`https://partners.dub.co/programs/${program.slug}`}
                  >
                    View program in Dub
                  </Link>
                </Section>
              </div>
            </Section>

            <Section>
              <div
                style={{ fontSize: "14px" }}
                dangerouslySetInnerHTML={{ __html: styledHtml }}
              />
            </Section>

            {program?.messagingEnabledAt &&
              campaign.type === "transactional" && (
                <Section className="mt-3">
                  <Link
                    className="block rounded-lg bg-neutral-900 px-6 py-3 text-center text-[13px] font-medium text-white no-underline"
                    href={`https://partners.dub.co/messages/${program.slug}`}
                  >
                    Reply in Dub
                  </Link>
                </Section>
              )}

            {campaign.type === "marketing" && (
              <Section className="border-t border-neutral-200">
                <Hr className="mx-0 my-3 w-full border border-neutral-200" />
                <Text className="text-[12px] leading-6 text-neutral-500">
                  Don't want to receive marketing emails from any programs on
                  Dub?{" "}
                  <Link
                    className="text-neutral-700 underline"
                    href="https://partners.dub.co/profile/notifications"
                  >
                    Update your notification settings here.
                  </Link>
                </Text>
              </Section>
            )}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
