"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramProps } from "@/lib/types";
import { ProgramPayoutMode } from "@dub/prisma/client";
import { RadioGroup, RadioGroupItem } from "@dub/ui";
import Link from "next/link";
import { UseFormSetValue, UseFormWatch } from "react-hook-form";

type FormData = Pick<
  ProgramProps,
  "holdingPeriodDays" | "minPayoutAmount" | "payoutMode"
>;

interface ProgramPayoutRoutingProps {
  setValue: UseFormSetValue<FormData>;
  watch: UseFormWatch<FormData>;
}

export function ProgramPayoutRouting({
  setValue,
  watch,
}: ProgramPayoutRoutingProps) {
  const payoutMode = watch("payoutMode");

  const payoutModeOptions = [
    {
      value: ProgramPayoutMode.internal,
      label: "Dub only",
      recommended: true,
      displayWebhookWarning: false,
      description: "All payouts are handled by Dub.",
    },
    {
      value: ProgramPayoutMode.hybrid,
      label: "Dub and external",
      recommended: false,
      displayWebhookWarning: payoutMode === ProgramPayoutMode.hybrid,
      description: (
        <>
          Partners with payouts enabled are paid by Dub, others via external
          payouts.{" "}
          <Link href="#" className="underline">
            Payout fees still apply.
          </Link>
        </>
      ),
    },
    {
      value: ProgramPayoutMode.external,
      label: "External only",
      recommended: false,
      displayWebhookWarning: payoutMode === ProgramPayoutMode.external,
      description: (
        <>
          All payouts are processed through your connected external payout
          method.{" "}
          <Link href="#" className="underline">
            Payout fees still apply.
          </Link>
        </>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-base font-semibold leading-6 text-neutral-900">
          Payout routing
        </h4>
        <p className="text-sm font-medium text-neutral-500">
          Choose how your payouts are processed on Dub.
        </p>
      </div>
      <div className="space-y-3">
        <RadioGroup
          value={payoutMode}
          onValueChange={(value) => {
            setValue("payoutMode", value as ProgramProps["payoutMode"], {
              shouldDirty: true,
            });
          }}
          className="space-y-3"
        >
          {payoutModeOptions.map(
            ({
              value,
              label,
              recommended,
              description,
              displayWebhookWarning,
            }) => (
              <div key={value} className="space-y-0">
                <label className="flex cursor-pointer items-start gap-2.5">
                  <div className="flex h-6 shrink-0 items-center">
                    <RadioGroupItem value={value} id={value} />
                  </div>
                  <div className="flex-1">
                    <div className="text-content-emphasis cursor-pointer text-sm font-medium">
                      {label} {recommended && "(Recommended)"}
                    </div>
                    <p className="text-content-subtle mt-0.5 text-xs font-normal leading-4">
                      {description}
                    </p>

                    {displayWebhookWarning && <WebhookWarning />}
                  </div>
                </label>
              </div>
            ),
          )}
        </RadioGroup>
      </div>
    </div>
  );
}

function WebhookWarning() {
  const { slug } = useWorkspace();

  return (
    <div className="mt-2 rounded-md border border-amber-100 bg-amber-50 px-2 py-1.5">
      <p className="text-xs leading-4 text-amber-700">
        Ensure your webhooks are configured to listen to{" "}
        <strong className="text-amber-800">payout.confirmed</strong> event on
        platform side.{" "}
        <Link
          href={`/${slug}/settings/webhooks`}
          className="font-normal underline"
          target="_blank"
        >
          Manage webhooks
        </Link>
      </p>
    </div>
  );
}
