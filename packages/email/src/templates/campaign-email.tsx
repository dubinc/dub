import { DUB_WORDMARK } from "@dub/utils";
import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
} from "@react-email/components";

export default function CampaignEmail({
  campaign = {
    subject: "Test Subject",
    body: `<p xmlns="http://www.w3.org/1999/xhtml">Hi <span class="px-1 py-0.5 bg-blue-100 text-blue-700 rounded font-semibold" data-type="mention" data-id="PartnerName">{{PartnerName}}</span>,</p><p xmlns="http://www.w3.org/1999/xhtml">Thrilled to have you officially join the Acme Ambassador Program!</p><p xmlns="http://www.w3.org/1999/xhtml">As a Acme Ambassador, you're joining the front line of change. You're freeing people from broken healthcare and giving them back control of their health.</p><p xmlns="http://www.w3.org/1999/xhtml">Your 3 quick steps to get started:</p><ol xmlns="http://www.w3.org/1999/xhtml"><li><p>Activate your membership with your 50% off code: <strong>ACME50OFF</strong></p></li><li><p><a target="_blank" rel="noopener noreferrer nofollow" href="https://partners.dub.co/programs/acme">Open your dashboard</a> and copy your referral link</p></li><li><p>Share Acme with your loved ones! Use our <a target="_blank" rel="noopener noreferrer nofollow" href="http://acme.dub.sh">Ambassador Hub</a> for all the information you need like message templates, images, and information about Acme.</p></li></ol><p xmlns="http://www.w3.org/1999/xhtml">And a bonus: make your first referral within 7 days and you'll also receive a limited-edition Acme hoodie.</p><img xmlns="http://www.w3.org/1999/xhtml" src="https://dubassets.com/programs/prog_CYCu7IMAapjkRpTnr8F1azjN/lander/image_JjbkiaM" /><p xmlns="http://www.w3.org/1999/xhtml">We're here with you every step of the way.</p><p xmlns="http://www.w3.org/1999/xhtml">To your health,</p><p xmlns="http://www.w3.org/1999/xhtml">The Acme team</p>`,
  },
}: {
  campaign?: {
    subject: string;
    body: string;
  };
}) {
  // Wrap the HTML with styles to prevent overflow from large images
  const styledHtml = `
    <div style="max-width: 100%; overflow: hidden;">
      <style>
        #campaign-email-body img { 
          max-width: 100% !important; 
          height: auto !important; 
          margin: 12px auto !important;
        }
      </style>
      ${campaign.body}
    </div>
  `;

  return (
    <Html>
      <Head />
      <Preview>{campaign.subject}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] px-10 py-5">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>

            <Section className="my-6">
              <div
                id="campaign-email-body"
                dangerouslySetInnerHTML={{ __html: styledHtml }}
              />
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
