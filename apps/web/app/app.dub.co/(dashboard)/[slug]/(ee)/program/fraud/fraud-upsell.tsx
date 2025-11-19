"use client";

import { FRAUD_RULES_BY_TYPE } from "@/lib/fraud/constants";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { usePartnersUpgradeModal } from "@/ui/partners/partners-upgrade-modal";
import { Button } from "@dub/ui";
import { ShieldKeyhole } from "@dub/ui/icons";
import { formatDate, OG_AVATAR_URL } from "@dub/utils";

const EXAMPLE_FRAUD_EVENTS: {
  type: keyof typeof FRAUD_RULES_BY_TYPE;
  partnerName: string;
  date: Date;
}[] = [
  {
    type: "paidTrafficDetected",
    partnerName: "Olivia Carter",
    date: new Date("2025-11-10"),
  },
  {
    type: "referralSourceBanned",
    partnerName: "Sarah Johnson",
    date: new Date("2025-11-08"),
  },
];

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
            <div
              className="flex w-full max-w-md flex-col gap-4 overflow-hidden px-4 [mask-image:linear-gradient(black_80%,transparent)]"
              aria-hidden
            >
              {EXAMPLE_FRAUD_EVENTS.map((event, idx) => (
                <ExampleFraudEventCell key={idx} event={event} />
              ))}
            </div>
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

function ExampleFraudEventCell({
  event,
}: {
  event: (typeof EXAMPLE_FRAUD_EVENTS)[number];
}) {
  const rule = FRAUD_RULES_BY_TYPE[event.type];

  return (
    <div className="flex w-full select-none items-center justify-between gap-4 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50">
          <ShieldKeyhole className="size-5 text-neutral-600" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="text-sm font-semibold text-neutral-900">
            {rule?.name || "Fraud detected"}
          </span>
          <div className="flex items-center gap-2">
            <img
              src={`${OG_AVATAR_URL}${event.partnerName}`}
              alt={event.partnerName}
              className="size-6 shrink-0 rounded-full bg-white"
            />
            <span className="whitespace-nowrap text-sm text-neutral-600">
              {event.partnerName}
            </span>
            <span className="whitespace-nowrap text-sm text-neutral-500">
              {formatDate(event.date, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0">
        <Button
          text="Review"
          variant="primary"
          className="h-7 rounded-lg bg-black px-3 text-white hover:bg-black/90 disabled:bg-black disabled:opacity-50"
          disabled
        />
      </div>
    </div>
  );
}
