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
import { WorkspaceProps } from "../../../../apps/web/lib/types";
import { Footer } from "../components/footer";

export function LinksLimitAlert({
  email = "panic@thedis.co",
  workspace = {
    id: "ckqf1q3xw0000gk5u2q1q2q1q",
    name: "Acme",
    slug: "acme",
    linksUsage: 800,
    linksLimit: 1000,
    plan: "pro",
  },
}: {
  email: string;
  workspace: Partial<WorkspaceProps>;
}) {
  const { slug, name, linksUsage, linksLimit, plan } = workspace as {
    slug: string;
    name: string;
    linksUsage: number;
    linksLimit: number;
    plan: string;
  };
  const percentage = Math.round((linksUsage / linksLimit) * 100);
  const nextPlan = getNextPlan(plan as string);

  return (
    <Html>
      <Head />
      <Preview>
        Your Dub workspace, {name} has used {percentage.toString()}% of its
        links limit for the month.
      </Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[500px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mt-8">
              <Img
                src={DUB_WORDMARK}
                height="40"
                alt="Dub"
                className="mx-auto my-0"
              />
            </Section>
            <Heading className="mx-0 my-7 p-0 text-center text-xl font-semibold text-black">
              Dub.co Links Limit Alert
            </Heading>
            <Text className="text-sm leading-6 text-black">
              Your Dub.co workspace,{" "}
              <Link
                href={`https://app.dub.co/${slug}`}
                className="text-black underline"
              >
                <strong>{name}</strong>
              </Link>{" "}
              has used <strong>{percentage.toString()}%</strong> of the monthly
              links limit included in the {capitalize(plan)} plan. You have
              created a total of{" "}
              <strong>{nFormatter(linksUsage, { full: true })} links</strong>{" "}
              (out of a maximum of {nFormatter(linksLimit, { full: true })}{" "}
              links) in your current billing cycle.
            </Text>

            {plan === "business-max" || plan === "enterprise" ? (
              <Text className="text-sm leading-6 text-black">
                Since you're on the {capitalize(plan)} plan, you will still be
                able to create links even after you hit your limit. We're
                planning to introduce on-demand billing for overages in the
                future, but for now, you can continue to create links without
                any interruption.
              </Text>
            ) : percentage === 100 ? (
              <Text className="text-sm leading-6 text-black">
                All your existing links will continue to work, and we are still
                collecting data on them, but you'll need to upgrade the{" "}
                <Link
                  href={nextPlan.link}
                  className="font-medium text-blue-600 no-underline"
                >
                  {nextPlan.name} plan
                </Link>{" "}
                add more links.
              </Text>
            ) : (
              <Text className="text-sm leading-6 text-black">
                Once you hit your limit, you'll need to upgrade to the{" "}
                <Link
                  href={nextPlan.link}
                  className="font-medium text-blue-600 no-underline"
                >
                  {nextPlan.name} plan
                </Link>{" "}
                to add more links.
              </Text>
            )}
            <Section className="mb-8 text-center">
              <Link
                className="rounded-full bg-black px-6 py-3 text-center text-[12px] font-semibold text-white no-underline"
                href={`https://app.dub.co/${slug}/upgrade`}
              >
                Upgrade my plan
              </Link>
            </Section>
            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export default LinksLimitAlert;
