"use client";

import { CircleCheck, CircleWarning, EnvelopeArrowRight } from "@dub/ui";

interface CampaignMetricsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CampaignMetrics({ isOpen, onClose }: CampaignMetricsProps) {
  // Placeholder data - will be replaced with real data later
  const metrics = [
    {
      icon: CircleCheck,
      label: "Delivered",
      percentage: "95.91%",
      count: "8,700",
    },
    {
      icon: CircleWarning,
      label: "Bounced",
      percentage: "4.09%",
      count: "370",
    },
    {
      icon: EnvelopeArrowRight,
      label: "Opened",
      percentage: "35.64%",
      count: "3,200",
    },
  ];

  return (
    <div>
      <div className="border-border-subtle flex h-12 items-center justify-between border-b px-6 sm:h-16">
        <h2 className="text-lg font-semibold text-gray-900">Metrics</h2>
      </div>

      <div className="bg-neutral-50 p-6">
        <div className="flex flex-col gap-6 divide-y divide-neutral-200 rounded-lg border border-neutral-200">
          {metrics.map((metric) => (
            <div key={metric.label} className="flex w-full flex-col">
              <div className="flex items-center gap-1.5 p-3">
                <metric.icon className="size-3.5 text-gray-500" />
                <div className="text-xs font-medium text-gray-500">
                  {metric.label}
                </div>
              </div>

              <div className="flex justify-between">
                <span>{metric.percentage}</span>
                <span>{metric.count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

{
  /* <div className="text-2xl font-normal text-gray-600">
{metric.count}
</div> */
}

{
  /* <div className="flex">
<div className="text-sm text-gray-500">{metric.label}</div>
<div className="text-2xl font-semibold text-gray-900">
  {metric.percentage}
</div>
</div> */
}
