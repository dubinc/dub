"use client";

import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { useAdvancedUpsellModal } from "@/ui/partners/advanced-upsell-modal";
import { Button } from "@dub/ui";
import { ExampleRiskEvents } from "./example-risk-events";

export function RiskCenterUpsell() {
  const { advancedUpsellModal, setShowAdvancedUpsellModal } =
    useAdvancedUpsellModal();

  return (
    <>
      {advancedUpsellModal}
      <PageContent title="Risk Center">
        <PageWidthWrapper>
          <div className="flex min-h-[calc(100vh-200px)] flex-col items-center justify-center gap-6 overflow-hidden px-4 py-10">
            <ExampleRiskEvents />
            <div className="max-w-sm text-pretty text-center">
              <span className="text-base font-medium text-neutral-900">
                Risk Center
              </span>
              <p className="text-content-subtle mt-2 text-sm">
                Protect your program and partners with{" "}
                <a
                  href="https://dub.co/help/article/risk-monitoring"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-content-default hover:text-content-emphasis cursor-alias underline decoration-dotted underline-offset-2"
                >
                  risk monitoring.
                </a>{" "}
                Available on Advanced plans and higher.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowAdvancedUpsellModal(true)}
                text="Upgrade to Advanced"
                className="h-8 px-3"
              />
            </div>
          </div>
        </PageWidthWrapper>
      </PageContent>
    </>
  );
}
