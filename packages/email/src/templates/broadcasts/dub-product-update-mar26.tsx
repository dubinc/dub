import { DUB_WORDMARK } from "@dub/utils";
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
import { Footer } from "../../components/footer";

export default function DubProductUpdateMar26({
  email = "panic@thedis.co",
  unsubscribeUrl = "https://partners.dub.co/account/settings",
}: {
  email: string;
  unsubscribeUrl: string;
}) {
  return (
    <Html>
      <Head>
        <style>{`
          @media only screen and (max-width: 600px) {
            .email-container {
              padding-left: 16px !important;
              padding-right: 16px !important;
            }
          }
        `}</style>
      </Head>
      <Preview>
        Social metrics bounties, stablecoin payouts, advanced filters, staggered
        rewards, group move rules, Stripe free trials, and bulk partner invites.
      </Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="email-container mx-auto my-10 max-w-[600px] px-10 py-5">
            <Section className="mt-2 text-center">
              <Img
                src={DUB_WORDMARK}
                width="65"
                height="32"
                alt="Dub"
                style={{
                  display: "block",
                  margin: "0 auto",
                }}
              />
            </Section>

            <Heading className="mx-0 mb-2 mt-8 p-0 text-center text-2xl font-semibold text-black">
              Dub Partners Product Updates
            </Heading>

            <Text className="mx-auto mb-8 mt-0 max-w-sm text-center text-base leading-6 text-neutral-600">
              Here are some of the exciting new features that we've shipped over
              the last few months 👇
            </Text>

            <Section className="mb-6">
              <Link
                href="https://ship.dub.co/FDpw3Ar"
                style={{ textDecoration: "none" }}
              >
                <Img
                  src="https://assets.dub.co/cms/social-metrics-bounties.jpg"
                  width={560}
                  height={320}
                  alt="Social Metrics Bounties"
                  className="mb-3 w-full rounded-lg"
                  style={{
                    display: "block",
                    maxWidth: "100%",
                    height: "auto",
                    borderRadius: "8px",
                  }}
                />
              </Link>
              <Heading className="mx-0 mb-2 mt-0 p-0 text-base font-semibold text-black">
                1. Social Metrics Bounties
              </Heading>
              <Text className="mx-0 mb-2 mt-0 text-sm leading-6 text-neutral-600">
                You can now reward partners for creating viral content – e.g.
                "Earn $50 per 1K views on YouTube, up to 100K views".
              </Text>

              <Text className="mx-0 mb-2 mt-0 text-sm leading-6 text-neutral-600">
                Perfect for influencer/UGC campaigns.
              </Text>
              <Section className="mt-4 text-center">
                <Link
                  href="https://ship.dub.co/FDpw3Ar"
                  className="block w-full rounded-lg bg-neutral-900 py-2.5 text-center text-sm font-medium text-white no-underline"
                  style={{
                    backgroundColor: "#171717",
                    color: "#ffffff",
                    borderRadius: "8px",
                    padding: "10px 16px",
                    textDecoration: "none",
                    fontWeight: "500",
                    fontSize: "14px",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  Learn more
                </Link>
              </Section>
            </Section>

            <Hr className="mx-0 my-5 w-full border border-neutral-200" />

            <Section className="mb-6">
              <Link
                href="https://ship.dub.co/ekrtx8B"
                style={{ textDecoration: "none" }}
              >
                <Img
                  src="https://assets.dub.co/cms/introducing-stablecoin-payouts.jpg"
                  width={560}
                  height={320}
                  alt="Stablecoin payouts"
                  className="mb-3 w-full rounded-lg"
                  style={{
                    display: "block",
                    maxWidth: "100%",
                    height: "auto",
                    borderRadius: "8px",
                  }}
                />
              </Link>
              <Heading className="mx-0 mb-2 mt-0 p-0 text-base font-semibold text-black">
                2. Stablecoin payouts
              </Heading>
              <Text className="mx-0 mb-2 mt-0 text-sm leading-6 text-neutral-600">
                Your partners can now connect a crypto wallet and get paid in
                USDC in minutes instead of waiting up to 15 business days with
                regular bank payouts.
              </Text>
              <Section className="mt-4 text-center">
                <Link
                  href="https://ship.dub.co/ekrtx8B"
                  className="block w-full rounded-lg bg-neutral-900 py-2.5 text-center text-sm font-medium text-white no-underline"
                  style={{
                    backgroundColor: "#171717",
                    color: "#ffffff",
                    borderRadius: "8px",
                    padding: "10px 16px",
                    textDecoration: "none",
                    fontWeight: "500",
                    fontSize: "14px",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  Learn more
                </Link>
              </Section>
            </Section>

            <Hr className="mx-0 my-5 w-full border border-neutral-200" />

            <Section className="mb-6">
              <Link
                href="https://ship.dub.co/GPtn2rL"
                style={{ textDecoration: "none" }}
              >
                <Img
                  src="https://assets.dub.co/cms/advanced-analytics-filters.jpg"
                  width={560}
                  height={320}
                  alt="Advanced analytics filters"
                  className="mb-3 w-full rounded-lg"
                  style={{
                    display: "block",
                    maxWidth: "100%",
                    height: "auto",
                    borderRadius: "8px",
                  }}
                />
              </Link>
              <Heading className="mx-0 mb-2 mt-0 p-0 text-base font-semibold text-black">
                3. Advanced analytics filters
              </Heading>
              <Text className="mx-0 mb-2 mt-0 text-sm leading-6 text-neutral-600">
                Build stronger reports with multi-filtering ("IS ONE OF"),
                negative filtering ("IS NOT"), and filters across partners,
                groups, links, folders, tags, country, device, and more.
              </Text>
              <Text className="mx-0 mb-2 mt-0 text-sm leading-6 text-neutral-600">
                Available for Dub Partners and Dub Links, including via API.
              </Text>
              <Section className="mt-4 text-center">
                <Link
                  href="https://ship.dub.co/GPtn2rL"
                  className="block w-full rounded-lg bg-neutral-900 py-2.5 text-center text-sm font-medium text-white no-underline"
                  style={{
                    backgroundColor: "#171717",
                    color: "#ffffff",
                    borderRadius: "8px",
                    padding: "10px 16px",
                    textDecoration: "none",
                    fontWeight: "500",
                    fontSize: "14px",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  Learn more
                </Link>
              </Section>
            </Section>

            <Hr className="mx-0 my-5 w-full border border-neutral-200" />

            <Section className="mb-6">
              <Link
                href="https://ship.dub.co/WWvS3DW"
                style={{ textDecoration: "none" }}
              >
                <Img
                  src="https://assets.dub.co/cms/staggered-reward-durations.jpg"
                  width={560}
                  height={320}
                  alt="Staggered reward durations"
                  className="mb-3 w-full rounded-lg"
                  style={{
                    display: "block",
                    maxWidth: "100%",
                    height: "auto",
                    borderRadius: "8px",
                  }}
                />
              </Link>
              <Heading className="mx-0 mb-2 mt-0 p-0 text-base font-semibold text-black">
                4. Staggered reward durations
              </Heading>
              <Text className="mx-0 mb-2 mt-0 text-sm leading-6 text-neutral-600">
                Set different commission rates by subscription duration (e.g.
                25% for first 12 months, 10% after), subscription start date, or
                partner signup date so you can reward early or high-value
                customers differently.
              </Text>
              <Section className="mt-4 text-center">
                <Link
                  href="https://ship.dub.co/WWvS3DW"
                  className="block w-full rounded-lg bg-neutral-900 py-2.5 text-center text-sm font-medium text-white no-underline"
                  style={{
                    backgroundColor: "#171717",
                    color: "#ffffff",
                    borderRadius: "8px",
                    padding: "10px 16px",
                    textDecoration: "none",
                    fontWeight: "500",
                    fontSize: "14px",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  Learn more
                </Link>
              </Section>
            </Section>

            <Hr className="mx-0 my-5 w-full border border-neutral-200" />

            <Section className="mb-6">
              <Link
                href="https://ship.dub.co/iDS6QV6"
                style={{ textDecoration: "none" }}
              >
                <Img
                  src="https://assets.dub.co/cms/group-move-rules.jpg"
                  width={560}
                  height={320}
                  alt="Group move rules"
                  className="mb-3 w-full rounded-lg"
                  style={{
                    display: "block",
                    maxWidth: "100%",
                    height: "auto",
                    borderRadius: "8px",
                  }}
                />
              </Link>
              <Heading className="mx-0 mb-2 mt-0 p-0 text-base font-semibold text-black">
                5. Group move rules
              </Heading>
              <Text className="mx-0 mb-2 mt-0 text-sm leading-6 text-neutral-600">
                Automatically move partners to a group when they hit performance
                milestones (leads, conversions, revenue, or commissions). Dub
                also shows a history of group moves for transparency and
                auditability.
              </Text>
              <Section className="mt-4 text-center">
                <Link
                  href="https://ship.dub.co/iDS6QV6"
                  className="block w-full rounded-lg bg-neutral-900 py-2.5 text-center text-sm font-medium text-white no-underline"
                  style={{
                    backgroundColor: "#171717",
                    color: "#ffffff",
                    borderRadius: "8px",
                    padding: "10px 16px",
                    textDecoration: "none",
                    fontWeight: "500",
                    fontSize: "14px",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  Learn more
                </Link>
              </Section>
            </Section>

            <Hr className="mx-0 my-5 w-full border border-neutral-200" />

            <Section className="mb-6">
              <Link
                href="https://ship.dub.co/hHzqgo1"
                style={{ textDecoration: "none" }}
              >
                <Img
                  src="https://assets.dub.co/cms/stripe-free-trial.jpg"
                  width={560}
                  height={320}
                  alt="Stripe integration: free trials"
                  className="mb-3 w-full rounded-lg"
                  style={{
                    display: "block",
                    maxWidth: "100%",
                    height: "auto",
                    borderRadius: "8px",
                  }}
                />
              </Link>
              <Heading className="mx-0 mb-2 mt-0 p-0 text-base font-semibold text-black">
                6. Support for Stripe free trials
              </Heading>
              <Text className="mx-0 mb-2 mt-0 text-sm leading-6 text-neutral-600">
                You can now track Stripe free trials as lead events (and by
                extension, lead rewards for partners). Optionally, you can also
                track the provisioned subscription quantity as separate lead
                events for clearer attribution.
              </Text>
              <Section className="mt-4 text-center">
                <Link
                  href="https://ship.dub.co/hHzqgo1"
                  className="block w-full rounded-lg bg-neutral-900 py-2.5 text-center text-sm font-medium text-white no-underline"
                  style={{
                    backgroundColor: "#171717",
                    color: "#ffffff",
                    borderRadius: "8px",
                    padding: "10px 16px",
                    textDecoration: "none",
                    fontWeight: "500",
                    fontSize: "14px",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  Learn more
                </Link>
              </Section>
            </Section>

            <Hr className="mx-0 my-5 w-full border border-neutral-200" />

            <Section className="mb-8">
              <Link
                href="https://ship.dub.co/Htt5kOP"
                style={{ textDecoration: "none" }}
              >
                <Img
                  src="https://assets.dub.co/cms/bulk-invite-partners.jpg"
                  width={560}
                  height={320}
                  alt="Bulk invite partners"
                  className="mb-3 w-full rounded-lg"
                  style={{
                    display: "block",
                    maxWidth: "100%",
                    height: "auto",
                    borderRadius: "8px",
                  }}
                />
              </Link>
              <Heading className="mx-0 mb-2 mt-0 p-0 text-base font-semibold text-black">
                7. Bulk invite partners + more updates
              </Heading>
              <Text className="mx-0 mb-2 mt-0 text-sm leading-6 text-neutral-600">
                You can now invite multiple partners at once and customize the
                invitation email. A few other updates:
              </Text>
              <Text className="mx-0 mb-2 mt-0 text-sm leading-6 text-neutral-600">
                • Bounties, Commissions, and Payouts APIs
                <br />
                • “Paid” and “Canceled” columns on customer tables
                <br />
                • Group reward update logs for auditability
              </Text>
              <Section className="mt-4 text-center">
                <Link
                  href="https://ship.dub.co/Htt5kOP"
                  className="block w-full rounded-lg bg-neutral-900 py-2.5 text-center text-sm font-medium text-white no-underline"
                  style={{
                    backgroundColor: "#171717",
                    color: "#ffffff",
                    borderRadius: "8px",
                    padding: "10px 16px",
                    textDecoration: "none",
                    fontWeight: "500",
                    fontSize: "14px",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  Learn more
                </Link>
              </Section>
            </Section>

            <Hr className="mx-0 my-5 w-full border border-neutral-200" />

            <Text className="mx-0 mb-2 mt-0 text-sm italic leading-6 text-neutral-600">
              Have any feedback about these new features? Just reply to this
              email – I'd love to hear from you! 💪
            </Text>
            <Text className="mx-0 mb-2 mt-0 text-sm italic leading-6 text-neutral-600">
              Steven from Dub.co
            </Text>

            <Section className="mx-auto max-w-[400px] text-center">
              <Footer email={email} marketing unsubscribeUrl={unsubscribeUrl} />
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
