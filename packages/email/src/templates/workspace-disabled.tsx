import { DUB_WORDMARK, capitalize, nFormatter } from "@dub/utils";
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
import { Footer } from "../components/footer";

export default function WorkspaceDisabled({
  email = "panic@thedis.co",
  workspace = {
    name: "Acme",
    slug: "acme",
    usage: 2_232_432,
    usageLimit: 1_000,
    plan: "free",
  },
}: {
  email: string;
  workspace: {
    name: string;
    slug: string;
    usage: number;
    usageLimit: number;
    plan: string;
  };
}) {
  const { slug, name, usage, usageLimit, plan } = workspace as {
    slug: string;
    name: string;
    usage: number;
    usageLimit: number;
    plan: string;
  };
  const percentage = nFormatter(Math.round((usage / usageLimit) * 100), {
    full: true,
  });

  const upgradeUrl = `https://app.dub.co/${slug}/settings/billing/upgrade?plan=advanced&planPeriod=yearly`;

  return (
    <Html>
      <Head />
      <Preview>
        Your Dub workspace, {name} has used {percentage}% of its events limit
        and has been disabled.
      </Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>
            <Heading className="mx-0 my-7 p-0 text-lg font-medium text-black">
              Your Dub workspace has been disabled
            </Heading>
            <Text className="text-sm leading-6 text-black">
              Your Dub workspace,{" "}
              <Link
                href={`https://app.dub.co/${slug}`}
                className="text-black underline"
              >
                <strong>{name}</strong>
              </Link>{" "}
              has used <strong>{percentage}%</strong> of the events limit
              included in the {capitalize(plan)} plan, which is in violation of
              our{" "}
              <Link
                href="https://dub.co/legal/terms"
                className="font-semibold text-black underline"
              >
                fair use policy
              </Link>
              . You have used a total of{" "}
              <strong>{nFormatter(usage, { full: true })} events</strong> (out
              of a maximum of {nFormatter(usageLimit, { full: true })} events).
            </Text>

            <Text className="text-sm leading-6 text-black">
              As a result, all links in your workspace have been disabled. You
              will need to{" "}
              <Link
                href={upgradeUrl}
                className="font-semibold text-black underline"
              >
                upgrade to a yearly Advanced plan
              </Link>{" "}
              to re-enable your links.
            </Text>

            <Section className="mb-8 mt-6">
              <Link
                className="w-full rounded-lg bg-black px-6 py-3 text-center text-[12px] font-semibold text-white no-underline"
                href={upgradeUrl}
              >
                Upgrade now
              </Link>
            </Section>
            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
