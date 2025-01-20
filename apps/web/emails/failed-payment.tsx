import { Project } from "@dub/prisma/client";
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
import { useTranslations } from "next-intl";
import Footer from "./components/footer";

export default function FailedPayment({
  user = { name: "Brendon Urie", email: "panic@thedis.co" },
  workspace = { name: "Dub", slug: "dub" },
  amountDue = 2400,
  attemptCount = 2,
}: {
  user: { name?: string | null; email: string };
  workspace: Pick<Project, "name" | "slug">;
  amountDue: number;
  attemptCount: number;
}) {
  const t = useTranslations("../emails");

  const title = `${
    attemptCount == 2 ? "2nd notice: " : attemptCount == 3 ? "3rd notice: " : ""
  }Your payment for Dub.co failed`;

  return (
    <Html>
      <Head />
      <Preview>{title}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[500px] rounded border border-solid border-gray-200 px-10 py-5">
            <Section className="mt-8">
              <Img
                src={DUB_WORDMARK}
                height="40"
                alt={t("dub-title")}
                className="mx-auto my-0"
              />
            </Section>
            <Heading className="mx-0 my-7 p-0 text-center text-xl font-semibold text-black">
              {t("failed-payment-notification")}
            </Heading>
            <Text className="text-sm leading-6 text-black">
              {t("greeting-with-user-name", {
                userNameUserName: user.name ? `, ${user.name}` : "",
              })}
            </Text>
            <Text className="text-sm leading-6 text-black">
              {t("payment-failure-details", {
                component0: (
                  <code className="text-purple-600">
                    {t("payment-failure-details_component0")}
                    {amountDue / 100}
                  </code>
                ),
                component1: (
                  <code className="text-purple-600">{workspace.name}</code>
                ),
                component2: (
                  <Link
                    href="https://dub.co/help/article/how-to-change-billing-information"
                    className="font-medium text-blue-600 no-underline"
                  >
                    {t("payment-failure-details_component2")}
                  </Link>
                ),
              })}
            </Text>
            <Section className="my-8 text-center">
              <Link
                className="rounded-full bg-black px-6 py-3 text-center text-[12px] font-semibold text-white no-underline"
                href={`https://app.dub.co/${workspace.slug}/settings/billing`}
              >
                {t("update-payment-information")}
              </Link>
            </Section>
            <Text className="text-sm leading-6 text-black">
              {t("customer-support-offer")}
            </Text>
            <Footer email={user.email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
