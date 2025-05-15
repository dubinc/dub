import { Tooltip } from "@dub/ui";
import { Text } from "@radix-ui/themes";
import { HelpCircleIcon } from "lucide-react";
import { FC } from "react";

interface ITooltipProps {
  tooltip: string;
  delayDuration?: number;
}

export const TooltipComponent: FC<ITooltipProps> = ({
  tooltip,
  delayDuration = 100,
}) => (
  <Tooltip
    side="top"
    align="center"
    avoidCollisions
    collisionPadding={24}
    delayDuration={delayDuration}
    content={
      <Text as="p" className="text-xs text-neutral-800">
        {tooltip}
      </Text>
    }
    className="border-border-500 max-w-[200px] rounded-md border bg-white p-1 shadow-sm"
  >
    <HelpCircleIcon className="h-4 w-4 text-neutral-500" />
  </Tooltip>
);
