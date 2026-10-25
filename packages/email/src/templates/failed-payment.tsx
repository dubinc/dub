import { currencyFormatter, DUB_WORDMARK } from "@dub/utils";
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
import { WorkspaceProps } from "../types";

export default function FailedPayment({
  user = {
    name: "Brendon Urie",
    email: "panic@thedis.co",
  },
  workspace = {
    name: "Dub",
    slug: "dub",
    plan: "business",
  },
  amountDue = 2400,
  attemptCount = 2,
}: {
  user: { name?: string | null; email: string };
  workspace: Pick<WorkspaceProps, "name" | "slug" | "plan">;
  amountDue: number;
  attemptCount: number;
}) {
  const title = `${
    attemptCount === 1
      ? ""
      : attemptCount == 2
        ? "2nd notice: "
        : attemptCount == 3
          ? "3rd notice: "
          : "Final notice: "
  }Your payment for Dub failed`;

  return (
    <Html>
      <Head />
      <Preview>{title}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mt-8">
              <Img src={DUB_WORDMARK} height="32" alt="Dub" />
            </Section>
            <Heading className="mx-0 my-7 p-0 text-lg font-medium text-black">
              {attemptCount == 2 || attemptCount == 3
                ? `${attemptCount == 2 ? "2nd" : "3rd"} payment attempt failed`
                : "Failed Payment for Dub"}
            </Heading>
            <Text className="text-sm leading-6 text-black">
              Hey{user.name ? ` ${user.name}` : ""},
            </Text>
            <Text className="text-sm leading-6 text-black">
              We were unable to process your payment of{" "}
              <code className="text-purple-600">
                {currencyFormatter(amountDue)}
              </code>{" "}
              for your Dub workspace{" "}
              <code className="text-purple-600">{workspace.name}</code>.
            </Text>
            <Text className="text-sm leading-6 text-black">
              Please{" "}
              <Link
                href="https://dub.co/help/article/how-to-change-billing-information"
                className="font-medium text-blue-600 no-underline"
              >
                update your payment method
              </Link>{" "}
              and retry your payment using the link below:
            </Text>
            <Section className="my-8">
              <Link
                className="rounded-lg bg-black px-6 py-3 text-center text-[12px] font-semibold text-white no-underline"
                href={`https://app.dub.co/${workspace.slug}/settings/billing#payment-methods`}
              >
                Update payment method
              </Link>
            </Section>
            <Text className="text-sm leading-6 text-black">
              If you have any questions, just reply to this email and we will
              help you get it sorted.
            </Text>
            <Footer email={user.email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
