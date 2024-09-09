import { DUB_WORDMARK, getPrettyUrl } from "@dub/utils";
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
import Footer from "./components/footer";

export default function NewReferralSale({
  email = "panic@thedis.co",
  workspace = {
    name: "Acme, Inc",
    slug: "acme",
  },
  saleAmount = 4900,
}: {
  email: string;
  workspace: {
    name: string;
    slug: string;
  };
  saleAmount: number;
}) {
  const referralLink = `https://refer.dub.co/${workspace.slug}`;
  const saleAmountInDollars = Math.round(saleAmount / 100).toLocaleString();
  return (
    <Html>
      <Head />
      <Preview>
        You just made a ${saleAmountInDollars} sale via your referral link{" "}
        {getPrettyUrl(referralLink)}
      </Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[500px] rounded border border-solid border-gray-200 px-10 py-5">
            <Section className="mt-8">
              <Img
                src={DUB_WORDMARK}
                height="40"
                alt="Dub.co"
                className="mx-auto my-0"
              />
            </Section>
            <Heading className="mx-0 my-7 p-0 text-center text-xl font-semibold text-black">
              You just made a ${saleAmountInDollars} referral sale!
            </Heading>
            <Text className="text-sm leading-6 text-black">
              Congratulations – someone just upgraded their Dub plan using your
              referral link:{" "}
              <a
                href={referralLink}
                className="text-semibold font-medium text-black underline"
              >
                {getPrettyUrl(referralLink)}
              </a>
            </Text>
            <Text className="text-sm leading-6 text-black">
              As a thank you from us for spreading the word about Dub, you will
              receive{" "}
              <strong>10% of every successful payment from this sale</strong> –
              for the first 12 months.
            </Text>
            <Section className="my-8 text-center">
              <Link
                className="rounded-full bg-black px-6 py-3 text-center text-[12px] font-semibold text-white no-underline"
                href={`https://app.dub.co/${workspace.slug}/settings/referrals`}
              >
                View your referral stats
              </Link>
            </Section>
            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
