import { HelpButton } from "../sidebar/help-button";
import { OnboardingButton } from "./onboarding/onboarding-button";

const toolbarItems = ["onboarding", "help"] as const;

type ToolbarProps = {
  show?: (typeof toolbarItems)[number][];
};

export default function Toolbar(props: ToolbarProps) {
  return (
    <div className="fixed bottom-0 right-0 z-40 m-5">
      <div className="flex items-center gap-3">
        {props.show?.includes("onboarding") && (
          <div className="shrink-0">
            <OnboardingButton />
          </div>
        )}
        {props.show?.includes("help") && (
          <div className="shrink-0">
            <HelpButton />
          </div>
        )}
      </div>
    </div>
  );
}
