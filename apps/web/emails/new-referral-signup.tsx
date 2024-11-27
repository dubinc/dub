import { REFERRAL_CLICKS_QUOTA_BONUS } from "@/lib/embed/constants";
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

export default function NewReferralSignup({
  email = "panic@thedis.co",
  workspace = {
    name: "Acme, Inc",
    slug: "acme",
  },
}: {
  email: string;
  workspace: {
    name: string;
    slug: string;
  };
}) {
  const referralLink = `https://refer.dub.co/${workspace.slug}`;
  return (
    <Html>
      <Head />
      <Preview>New referral signup</Preview>
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
              New referral signup
            </Heading>
            <Text className="text-sm leading-6 text-black">
              Congratulations – someone just signed up for Dub using your
              referral link:{" "}
              <a
                href={referralLink}
                className="text-semibold font-medium text-black underline"
              >
                {getPrettyUrl(referralLink)}
              </a>
            </Text>
            <Text className="text-sm leading-6 text-black">
              As a thank you from us for spreading the word about Dub, you've
              earned an additional {REFERRAL_CLICKS_QUOTA_BONUS} clicks quota
              for your{" "}
              <a
                href={`https://app.dub.co/${workspace.slug}`}
                className="text-semibold font-medium text-black underline"
              >
                {workspace.name}
              </a>{" "}
              workspace on Dub.
            </Text>
            <Section className="my-8 text-center">
              <Link
                className="rounded-full bg-black px-6 py-3 text-center text-[12px] font-semibold text-white no-underline"
                href={`https://app.dub.co/${workspace.slug}`}
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
