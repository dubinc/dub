import { Globe } from "@dub/ui/icons";
import { useTranslations } from "next-intl";
import { StepPage } from "../../step-page";
import { Form } from "./form";

export default function Custom() {
  const t = useTranslations(
    "app.dub.co/(onboarding)/onboarding/(steps)/domain/custom",
  );

  return (
    <StepPage
      icon={Globe}
      title="Connect a custom domain"
      description={
        <a
          href="https://dub.co/help/article/choosing-a-custom-domain"
          target="_blank"
          className="underline transition-colors hover:text-gray-700"
        >
          {t("read-guide-best-practices")}
        </a>
      }
    >
      <Form />
    </StepPage>
  );
}
