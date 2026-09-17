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

export default function DubProductUpdateSummer26({
  email = "panic@thedis.co",
  unsubscribeUrl = "https://app.dub.co/account/settings",
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
        Bounties/email campaigns improvements, custom metadata rewards,
        retainer-style custom rewards, improved yearly pricing, and other
        updates.
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
              Dub.co Product Update (Summer '26)
            </Heading>

            <Text className="mx-auto mb-8 mt-0 max-w-sm text-center text-base leading-6 text-neutral-600">
              Here are some of the exciting new features that we've shipped over
              the last few months 👇
            </Text>

            <Section className="mb-6">
              <Link
                href="https://ship.dub.co/bounties-campaigns-improvements"
                style={{ textDecoration: "none" }}
              >
                <Img
                  src="https://assets.dub.co/cms/bounties-campaigns-improvements.jpg"
                  width={560}
                  height={320}
                  alt="Improvements to bounties and email campaigns"
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
                1. Improvements to bounties and email campaigns
              </Heading>
              <Text className="mx-0 mb-2 mt-0 text-sm leading-6 text-neutral-600">
                You can now:
              </Text>
              <Text className="mx-0 mb-1 mt-0 pl-4 text-sm leading-6 text-neutral-600">
                • Scope bounties and email campaigns by partner tags
              </Text>
              <Text className="mx-0 mb-1 mt-0 pl-4 text-sm leading-6 text-neutral-600">
                • Set dynamic start dates for bounties
              </Text>
              <Text className="mx-0 mb-2 mt-0 pl-4 text-sm leading-6 text-neutral-600">
                • Combine multiple conditions for transactional email campaigns
              </Text>
              <Section className="mt-4 text-center">
                <Link
                  href="https://ship.dub.co/bounties-campaigns-improvements"
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
                href="https://ship.dub.co/reward-metadata-conditions"
                style={{ textDecoration: "none" }}
              >
                <Img
                  src="https://assets.dub.co/cms/reward-metadata-conditions.jpg"
                  width={560}
                  height={320}
                  alt="Reward partners based on custom metadata"
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
                2. Custom metadata rewards + AI reward builder
              </Heading>
              <Text className="mx-0 mb-2 mt-0 text-sm leading-6 text-neutral-600">
                You can now customize partner rewards based on any{" "}
                <code>metadata</code> you attach to tracking events – e.g.
                different revshare rates for <code>trade</code> vs{" "}
                <code>deposit</code> events.
              </Text>
              <Text className="mx-0 mb-2 mt-0 text-sm leading-6 text-neutral-600">
                We also added an{" "}
                <Link
                  href="https://ship.dub.co/ai-reward-builder"
                  className="font-medium text-black underline"
                >
                  AI reward builder
                </Link>
                : describe the structure you want, and we'll generate the reward
                automatically.
              </Text>
              <Section className="mt-4 text-center">
                <Link
                  href="https://ship.dub.co/reward-metadata-conditions"
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
                href="https://ship.dub.co/retainer-rewards"
                style={{ textDecoration: "none" }}
              >
                <Img
                  src="https://assets.dub.co/cms/retainer-rewards.jpg"
                  width={560}
                  height={320}
                  alt="Retainer-style custom rewards"
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
                3. Retainer-style custom rewards
              </Heading>
              <Text className="mx-0 mb-2 mt-0 text-sm leading-6 text-neutral-600">
                You can now pay partners a fixed amount on a regular cadence –
                daily, weekly, biweekly, monthly, quarterly, or yearly.
              </Text>
              <Text className="mx-0 mb-2 mt-0 text-sm leading-6 text-neutral-600">
                Ideal for retainer-style agreements in exchange for ongoing
                promotion or sponsorship placements.
              </Text>
              <Section className="mt-4 text-center">
                <Link
                  href="https://ship.dub.co/retainer-rewards"
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
                href="https://ship.dub.co/improved-yearly-pricing"
                style={{ textDecoration: "none" }}
              >
                <Img
                  src="https://assets.dub.co/cms/improved-yearly-pricing.jpg"
                  width={560}
                  height={320}
                  alt="Improved yearly pricing"
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
                4. Improved yearly pricing
              </Heading>
              <Text className="mx-0 mb-2 mt-0 text-sm leading-6 text-neutral-600">
                You now get 12x usage upfront with any yearly plan – on top of a
                10% annual discount.
              </Text>

              <Text className="mx-0 mb-2 mt-0 text-sm leading-6 text-neutral-600">
                E.g. a Business yearly plan includes 3M tracked events/year
                instead of 250K/month, which is helpful when your traffic
                fluctuates month to month.
              </Text>
              <Section className="mt-4 text-center">
                <Link
                  href="https://ship.dub.co/improved-yearly-pricing"
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
                href="https://ship.dub.co/domain-connect"
                style={{ textDecoration: "none" }}
              >
                <Img
                  src="https://assets.dub.co/cms/domain%20authorization.jpg"
                  width={560}
                  height={320}
                  alt="One-click DNS setup with Domain Connect"
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
                5. Other updates
              </Heading>
              <Text className="mx-0 mb-2 mt-0 text-sm leading-6 text-neutral-600">
                •{" "}
                <Link
                  href="https://ship.dub.co/domain-connect"
                  className="font-medium text-black underline"
                >
                  One-click DNS setup with Domain Connect
                </Link>{" "}
                for domains hosted on Vercel or Cloudflare
                <br />•{" "}
                <Link
                  href="https://ship.dub.co/improve-link-clicked-webhook"
                  className="font-medium text-black underline"
                >
                  Improved <code>link.clicked</code> webhooks
                </Link>{" "}
                – trigger for all links, specific folders, or specific links
              </Text>
              <Section className="mt-4 text-center">
                <Link
                  href="https://ship.dub.co/domain-connect"
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
