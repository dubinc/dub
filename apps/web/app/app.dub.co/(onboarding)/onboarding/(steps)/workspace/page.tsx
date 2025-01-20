import { GridPlus } from "@dub/ui/icons";
import { useTranslations } from "next-intl";
import { StepPage } from "../step-page";
import { Form } from "./form";

export default function Workspace() {
  const t = useTranslations(
    "app.dub.co/(onboarding)/onboarding/(steps)/workspace",
  );

  return (
    <StepPage
      icon={GridPlus}
      title="Create a workspace"
      description={
        <a
          href="https://dub.co/help/article/what-is-a-workspace"
          target="_blank"
          className="underline transition-colors hover:text-gray-700"
        >
          {t("what-is-a-workspace")}
        </a>
      }
    >
      <Form />
    </StepPage>
  );
}
