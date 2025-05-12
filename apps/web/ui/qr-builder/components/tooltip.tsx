import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@radix-ui/react-tooltip";
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
  <TooltipProvider delayDuration={delayDuration}>
    <Tooltip>
      <TooltipTrigger asChild>
        <HelpCircleIcon className="h-4 w-4 text-gray-400" />
      </TooltipTrigger>
      <TooltipContent
        className="border-border-500 rounded-md border bg-white p-1 shadow-sm"
        sideOffset={5}
      >
        <Text as="p" size="1" className="text-neutral">
          {tooltip}
        </Text>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);
