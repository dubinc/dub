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
import Footer from "./components/footer";

export default function WebhookAdded({
  email = "panicking@thedis.co",
  workspace = {
    name: "Acme, Inc",
    slug: "acme",
  },
  webhook = {
    name: "My Webhook",
  },
}: {
  email: string;
  workspace: {
    name: string;
    slug: string;
  };
  webhook: {
    name: string;
  };
}) {
  return (
    <Html>
      <Head />
      <Preview>New webhook added</Preview>
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
              New webhook added
            </Heading>
            <Text className="text-sm leading-6 text-black">
              Webhook with the name <strong>{webhook.name}</strong> has been
              added to your Dub.co workspace {workspace.name}.
            </Text>
            <Section className="mb-8 mt-4 text-center">
              <Link
                className="rounded-full bg-black px-6 py-3 text-center text-[12px] font-semibold text-white no-underline"
                href={`https://app.dub.co/${workspace.slug}/settings/webhooks`}
              >
                View Webhook
              </Link>
            </Section>
            <Text className="text-sm leading-6 text-black">
              If you did not create this webhook, you can{" "}
              <Link
                href={`https://app.dub.co/${workspace.slug}/settings/webhooks`}
                className="text-black underline"
              >
                <strong>delete this webhook</strong>
              </Link>{" "}
              from your account.
            </Text>
            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
