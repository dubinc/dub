import { DUB_WORDMARK, capitalize, getNextPlan, nFormatter } from "@dub/utils";
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
import { WorkspaceProps } from "../lib/types";
import Footer from "./components/footer";

export default function ClicksExceeded({
  email = "panic@thedis.co",
  workspace = {
    id: "ckqf1q3xw0000gk5u2q1q2q1q",
    name: "Acme",
    slug: "acme",
    usage: 2410,
    usageLimit: 1000,
    plan: "business",
  },
  type = "firstUsageLimitEmail",
}: {
  email: string;
  workspace: Partial<WorkspaceProps>;
  type: "firstUsageLimitEmail" | "secondUsageLimitEmail";
}) {
  const { slug, name, usage, usageLimit, plan } = workspace;
  const nextPlan = getNextPlan(plan as string);

  return (
    <Html>
      <Head />
      <Preview>
        Your Dub.co workspace, {name || ""} has exceeded the{" "}
        {capitalize(plan) || ""} Plan limit of {nFormatter(usageLimit)} link
        clicks/month.
      </Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[500px] rounded border border-solid border-gray-200 px-10 py-5">
            <Section className="mt-8">
              <Img
                src={DUB_WORDMARK}
                height="40"
                alt="Dub"
                className="mx-auto my-0"
              />
            </Section>
            <Heading className="mx-0 my-7 p-0 text-center text-xl font-semibold text-black">
              Clicks Limit Exceeded
            </Heading>
            <Text className="text-sm leading-6 text-black">
              Your Dub.co workspace,{" "}
              <Link
                href={`https://app.dub.co/${slug}`}
                className="text-black underline"
              >
                <strong>{name}</strong>
              </Link>{" "}
              has exceeded the
              <strong> {capitalize(plan)} Plan </strong>
              limit of{" "}
              <strong>{nFormatter(usageLimit)} link clicks/month</strong>. You
              have used{" "}
              <strong>{nFormatter(usage, { digits: 2 })} link clicks</strong>{" "}
              across all your links in your current billing cycle.
            </Text>
            <Text className="text-sm leading-6 text-black">
              All your existing links will continue to work, and we are still
              collecting data on them, but you'll need to upgrade to the{" "}
              <Link
                href={nextPlan.link}
                className="font-medium text-blue-600 no-underline"
              >
                {nextPlan.name} plan
              </Link>{" "}
              to view their stats.
            </Text>
            <Section className="my-8 text-center">
              <Link
                className="rounded-full bg-black px-6 py-3 text-center text-[12px] font-semibold text-white no-underline"
                href={`https://app.dub.co/${slug}?upgrade=${nextPlan.name.toLowerCase()}}`}
              >
                Upgrade my plan
              </Link>
            </Section>
            <Text className="text-sm leading-6 text-black">
              To respect your inbox,{" "}
              {type === "firstUsageLimitEmail"
                ? "we will only send you one more email about this in 3 days"
                : "this will be the last time we'll email you about this for the current billing cycle"}
              . Feel free to ignore this email if you don't plan on upgrading,
              or reply to let us know if you have any questions!
            </Text>
            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
