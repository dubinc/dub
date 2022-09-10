import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { ReactNode } from "react";

const Tooltip = ({
  children,
  content,
}: {
  children: ReactNode;
  content: ReactNode;
}) => {
  return (
    <TooltipPrimitive.Provider delayDuration={100}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Content
          sideOffset={4}
          side="top"
          className="animate-slide-up-fade inline-flex items-center rounded-md px-4 py-2.5 z-20 bg-white border border-gray-200 drop-shadow-lg"
        >
          <TooltipPrimitive.Arrow className="fill-current text-white" />
          <span className="block text-sm text-center text-gray-700 max-w-xs">
            {content}
          </span>
          <TooltipPrimitive.Arrow className="fill-current text-white" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
};

export default Tooltip;
