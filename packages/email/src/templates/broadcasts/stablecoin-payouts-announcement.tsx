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
import { Footer } from "../../components/footer";

export default function StablecoinPayoutsAnnouncement({
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
      <Preview>Connect your crypto wallet and get paid in USDC.</Preview>
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
              Stablecoin payouts are here
            </Heading>

            <Text className="mx-auto mb-8 mt-0 max-w-sm text-center text-base leading-6 text-neutral-600">
              You can now connect a crypto wallet of your choice and receive
              payouts in USDC.
            </Text>

            <Section className="mb-4 text-center">
              <Link
                href="https://ship.dub.co/stablecoins"
                style={{ textDecoration: "none" }}
              >
                <Img
                  src="https://assets.dub.co/misc/stablecoin-payouts.gif"
                  width="200"
                  height="200"
                  alt="Stablecoin payouts"
                  style={{
                    display: "block",
                    maxWidth: "100%",
                    height: "auto",
                    margin: "0 auto",
                  }}
                />
              </Link>
            </Section>

            <Heading className="mx-0 mb-3 mt-0 p-0 text-center text-lg font-semibold text-black">
              Get paid in USDC, in minutes
            </Heading>

            <Text className="mx-auto mb-8 mt-0 max-w-[420px] text-center text-sm leading-6 text-neutral-600">
              With stablecoin payouts, you can receive earnings in minutes –
              instead of waiting up to 15 business days. You also avoid the 1%
              FX fees with regular bank payouts.
            </Text>

            <Section className="mb-8 text-center">
              <Link
                href="https://ship.dub.co/stablecoins"
                className="box-border inline-block rounded-lg bg-neutral-900 px-6 py-3 text-center text-sm font-medium text-white no-underline"
                style={{
                  backgroundColor: "#171717",
                  color: "#ffffff",
                  borderRadius: "8px",
                  padding: "12px 24px",
                  textDecoration: "none",
                  display: "inline-block",
                  fontWeight: "500",
                  fontSize: "14px",
                }}
              >
                Connect your wallet
              </Link>
            </Section>

            <Section className="mx-auto max-w-[400px] text-center">
              <Footer email={email} marketing unsubscribeUrl={unsubscribeUrl} />
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
