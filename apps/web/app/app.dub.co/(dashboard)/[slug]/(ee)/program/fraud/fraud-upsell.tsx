"use client";

import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { usePartnersUpgradeModal } from "@/ui/partners/partners-upgrade-modal";
import { Button } from "@dub/ui";
import { ExampleFraudEvents } from "./example-fraud-events";

export function FraudUpsell() {
  const { partnersUpgradeModal, setShowPartnersUpgradeModal } =
    usePartnersUpgradeModal({
      plan: "Advanced",
    });

  return (
    <>
      {partnersUpgradeModal}
      <PageContent title="Fraud & Risk">
        <PageWidthWrapper>
          <div className="flex min-h-[calc(100vh-200px)] flex-col items-center justify-center gap-6 overflow-hidden px-4 py-10">
            <ExampleFraudEvents />
            <div className="max-w-sm text-pretty text-center">
              <span className="text-base font-medium text-neutral-900">
                Fraud and risk
              </span>
              <p className="text-content-subtle mt-2 text-sm">
                Protect your program and partners with{" "}
                <a
                  href="https://dub.co/help/article/fraud-risk-prevention"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-content-default hover:text-content-emphasis cursor-alias underline decoration-dotted underline-offset-2"
                >
                  fraud and risk detection.
                </a>{" "}
                Available on Advanced plans and higher.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowPartnersUpgradeModal(true)}
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
