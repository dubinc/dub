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
  Row,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import { Footer } from "../components/footer";
import { type TrialMarketingEmailProps } from "../components/trial-email-shell";

export default function TrialLinksFocusEmail({
  email = "panic@thedis.co",
  unsubscribeUrl,
  plan: _plan,
  workspaceSlug,
}: TrialMarketingEmailProps) {
  const dashboardUrl = `https://app.dub.co/${workspaceSlug}`;
  const linksUrl = `${dashboardUrl}/links`;
  const upgradeUrl = `${dashboardUrl}/settings/billing/upgrade`;

  return (
    <Html>
      <Head />
      <Preview>
        Custom domains, short links, previews, and A/B tests — start here.
      </Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>

            <Heading className="mx-0 my-7 p-0 text-xl font-semibold text-black">
              Get more from your links
            </Heading>

            <Text className="mb-6 text-sm leading-6 text-neutral-600">
              Create the best links and connect your domain so everything you
              share is branded, trusted, and trackable.
            </Text>

            <Heading className="mx-0 mb-3 mt-2 p-0 text-base font-semibold text-black">
              Start here:
            </Heading>

            <Text className="mb-4 text-sm leading-6 text-neutral-600">
              1. Use a custom domain —{" "}
              <Link
                href="https://dub.co/help/article/how-to-add-custom-domain"
                className="text-neutral-600 underline underline-offset-2"
              >
                Add a custom domain
              </Link>{" "}
              and increase trust and click-through rates on every link.
            </Text>

            <Text className="mb-4 text-sm leading-6 text-neutral-600">
              2. Create your first link:{" "}
              <Link
                href="https://dub.co/help/article/how-to-create-link"
                className="text-neutral-600 underline underline-offset-2"
              >
                Learn how to create short links
              </Link>{" "}
              and start tracking clicks in seconds.
            </Text>

            <Text className="mb-4 text-sm leading-6 text-neutral-600">
              3. Customize your link preview:{" "}
              <Link
                href="https://dub.co/help/article/custom-link-previews"
                className="text-neutral-600 underline underline-offset-2"
              >
                Control the title, image, and description
              </Link>{" "}
              to improve how your links appear and perform.
            </Text>

            <Text className="mb-4 text-sm leading-6 text-neutral-600">
              4. Enable link cloaking:{" "}
              <Link
                href="https://dub.co/help/article/link-cloaking"
                className="text-neutral-600 underline underline-offset-2"
              >
                Keep your brand visible
              </Link>{" "}
              in the URL bar instead of the destination link.
            </Text>

            <Text className="mb-6 text-sm leading-6 text-neutral-600">
              5. Run A/B tests:{" "}
              <Link
                href="https://dub.co/help/article/ab-testing"
                className="text-neutral-600 underline underline-offset-2"
              >
                Compare multiple destinations
              </Link>{" "}
              to see which drives more clicks and conversions.
            </Text>

            <Text className="mb-8 text-sm leading-6 text-neutral-600">
              Enjoy all the additional link features during your trial, and you
              can{" "}
              <Link
                href={upgradeUrl}
                className="text-neutral-600 underline underline-offset-2"
              >
                select a plan
              </Link>{" "}
              at any time during your trial to start a subscription.
            </Text>

            <Section className="mb-8">
              <Row>
                <Link
                  className="mr-2 inline w-fit rounded-lg bg-black px-4 py-2.5 text-center text-[14px] font-medium text-white no-underline"
                  href={linksUrl}
                >
                  View your links
                </Link>

                <Link
                  className="inline w-fit rounded-lg border border-solid border-neutral-200 bg-white px-4 py-2.5 text-center text-[14px] font-medium text-black no-underline"
                  href="https://dub.co/help/article/dub-links"
                >
                  Learn more about links
                </Link>
              </Row>
            </Section>

            <Footer email={email} marketing unsubscribeUrl={unsubscribeUrl} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
