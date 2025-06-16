import { Shopify } from "@/ui/layout/sidebar/conversions/icons/shopify";
import { Stripe } from "@/ui/layout/sidebar/conversions/icons/stripe";
import { ToggleGroup } from "@dub/ui";
import { Framer } from "lucide-react";
import { IntegrationGuide, IntegrationType } from "./types";

interface GuidesListProps {
  integrationType: IntegrationType;
  onIntegrationTypeChange: (type: IntegrationType) => void;
  onGuideSelect: (guide: IntegrationGuide) => void;
}

export const guides: IntegrationGuide[] = [
  {
    type: "no-code",
    title: "Framer",
    description: "Dub Analytics",
    icon: <Framer />,
    recommended: true,
  },
  {
    type: "no-code",
    title: "Shopify",
    description: "Dub Analytics",
    icon: <Shopify />,
  },
  {
    type: "no-code",
    title: "Webflow",
    description: "Dub Analytics",
    icon: <Stripe />,
  },
  {
    type: "code",
    title: "WordPress",
    description: "Dub Analytics",
    icon: <Shopify />,
  },
];

export function GuidesList({
  integrationType,
  onIntegrationTypeChange,
  onGuideSelect,
}: GuidesListProps) {
  return (
    <>
      <div className="flex flex-col gap-4">
        <ToggleGroup
          className="flex w-full items-center gap-1 rounded-md border border-neutral-200 bg-neutral-100 p-1"
          optionClassName="h-8 flex items-center justify-center rounded-md flex-1 text-sm font-medium transition-colors text-neutral-800"
          indicatorClassName="bg-white shadow border-none rounded-md"
          options={[
            { value: "no-code", label: "No-code integrations" },
            { value: "code", label: "Developer integrations" },
          ]}
          selected={integrationType}
          selectAction={onIntegrationTypeChange}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {guides
          .filter((g) => g.type === integrationType)
          .map((guide) => (
            <button
              key={guide.title}
              className="group relative flex h-40 cursor-pointer flex-col justify-center rounded-lg bg-neutral-200/40 transition-colors duration-100 hover:bg-neutral-200/60"
              onClick={() => onGuideSelect(guide)}
            >
              {guide.recommended && (
                <span className="absolute -top-2 left-1/2 z-10 -translate-x-1/2 rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-600">
                  Recommended
                </span>
              )}

              <div className="mb-4 flex h-16 items-center justify-center">
                <IconWrapper>{guide.icon}</IconWrapper>
              </div>

              <div className="text-center">
                <div className="text-sm font-semibold text-[##171717]">
                  {guide.title}
                </div>
                <div className="text-sm font-medium text-[#737373]">
                  {guide.description}
                </div>
              </div>
            </button>
          ))}
      </div>
    </>
  );
}

const IconWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="flex size-11 items-center justify-center">{children}</div>
);
