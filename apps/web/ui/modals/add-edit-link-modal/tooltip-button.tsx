"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import SimplePieChart from "@/ui/charts/simple-pie-chart";
import Infinity from "@/ui/shared/icons/infinity";
import { TooltipContent, useRouterStuff } from "@dub/ui";
import { Tooltip } from "@dub/ui/src/tooltip";
import { cn } from "@dub/utils";

// HOC to wrap a button with a tooltip and make it reusable
export default function TooltipButton() {
  return function WrappedTooltipButton({
    children,
    tooltip: { content, cta, ai },
    ...props
  }: {
    children: React.ReactNode;
    tooltip: {
      content: string;
      cta?: string;
      ai?: {
        title: string;
        data: {
          usage: number;
          limit: number;
        };
      };
    };
    [key: string]: any;
  }) {
    const { queryParams } = useRouterStuff();
    const { plan, nextPlan } = useWorkspace();

    const showUsage = plan === "free" || plan === "pro" || plan === "business";

    return (
      <Tooltip
        content={
          ai ? (
            ai.data.usage < ai.data.limit ? (
              <div className="flex items-center gap-4 px-4 py-2">
                <div>
                  <span className="block max-w-xs text-center text-sm text-gray-700">
                    {ai.title}
                  </span>
                  <span className="text-xs text-gray-500">
                    {showUsage
                      ? `${ai.data.limit - ai.data.usage} / ${ai.data.limit} AI credits left`
                      : "Unlimited credits left"}
                  </span>
                </div>
                {showUsage ? (
                  <SimplePieChart
                    data={[
                      {
                        name: "Remaining",
                        value: ai.data.limit - ai.data.usage,
                        color: "text-black",
                      },
                      {
                        name: "Used",
                        value: ai.data.usage,
                        color: "text-gray-200",
                      },
                    ]}
                  />
                ) : (
                  <Infinity className="h-6 w-6 text-gray-500" />
                )}
              </div>
            ) : (
              <TooltipContent
                title="You've reached your AI usage limit. Upgrade to Pro to get more AI credits."
                cta={`Upgrade to ${nextPlan.name}`}
                onClick={() => {
                  queryParams({
                    set: {
                      upgrade: nextPlan.name.toLowerCase(),
                    },
                  });
                }}
              />
            )
          ) : cta ? (
            <TooltipContent title={content} cta={cta} />
          ) : (
            content
          )
        }
      >
        <button
          {...props}
          disabled={props.disabled || (ai && ai?.data.usage >= ai?.data.limit)}
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-md text-gray-500 transition-colors duration-75 hover:bg-gray-100 active:bg-gray-200 disabled:cursor-not-allowed",
            props.className,
          )}
        >
          {children}
        </button>
      </Tooltip>
    );
  };
}

export const ButtonWithTooltip = TooltipButton();
