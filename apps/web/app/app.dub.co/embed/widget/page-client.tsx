"use client";

import {
  Button,
  Check2,
  Copy,
  MoneyBill2,
  ToggleGroup,
  useCopyToClipboard,
} from "@dub/ui";
import { currencyFormatter, getPrettyUrl } from "@dub/utils";
import { useState } from "react";
import { useReferralLink } from "../use-referral-link";
import { useReferralProgram } from "../use-referral-program";

type Tab = "invite" | "rewards";

export function EmbedWidgetPageClient() {
  const [copied, copyToClipboard] = useCopyToClipboard();
  const [selectedTab, setSelectedTab] = useState<Tab>("invite");

  const { link, isLoading: isLoadingLink } = useReferralLink();
  const { program, isLoading: isLoadingProgram } = useReferralProgram();

  return (
    <div>
      <div className="flex flex-col gap-2 rounded-lg rounded-b-none bg-black p-4">
        <MoneyBill2 className="flex size-14 rounded-full bg-gray-800 p-2 text-white" />
        <h2 className="mt-4 text-lg font-medium text-white">
          Refer a friend and earn
        </h2>

        <p className="text-sm text-gray-300">
          Earn additional credits and cash when you refer a friend and they sign
          up for {program?.name}
        </p>
      </div>

      <div className="mt-4 p-4">
        <ToggleGroup
          options={[
            { value: "invite", label: "Invite" },
            { value: "rewards", label: "Rewards" },
          ]}
          selected={selectedTab}
          selectAction={(option: Tab) => setSelectedTab(option)}
          className="grid grid-cols-2 bg-gray-100"
          optionClassName="w-full h-10"
          indicatorClassName="rounded-md bg-white border-none shadow-sm"
        />

        <div className="mt-4">
          {selectedTab === "invite" && (
            <>
              <div className="flex flex-col gap-2">
                {!isLoadingLink && link ? (
                  <input
                    type="text"
                    readOnly
                    value={getPrettyUrl(link.shortLink)}
                    className="xs:w-auto h-10 w-full rounded-md border border-neutral-300 px-3 text-sm focus:border-gray-500 focus:outline-none focus:ring-gray-500 lg:min-w-64 xl:min-w-72"
                  />
                ) : (
                  <div className="h-10 animate-pulse rounded-md bg-neutral-200" />
                )}
                <Button
                  icon={
                    copied ? (
                      <Check2 className="size-4" />
                    ) : (
                      <Copy className="size-4" />
                    )
                  }
                  text={copied ? "Copied link" : "Copy link"}
                  onClick={() => copyToClipboard(getPrettyUrl(link?.shortLink))}
                  disabled={isLoadingLink}
                />
              </div>
            </>
          )}

          {selectedTab === "rewards" && (
            <>
              <h2 className="text-lg font-bold">Activity</h2>
              {isLoadingLink || !link ? (
                <div className="mt-4 grid grid-cols-3 gap-4">
                  <div className="flex animate-pulse flex-col gap-2 rounded-lg bg-gray-200 p-3 shadow-sm">
                    <span className="h-4 w-1/2 rounded bg-gray-300"></span>
                    <span className="h-6 w-3/4 rounded bg-gray-300"></span>
                  </div>
                  <div className="flex animate-pulse flex-col gap-2 rounded-lg bg-gray-200 p-3 shadow-sm">
                    <span className="h-4 w-1/2 rounded bg-gray-300"></span>
                    <span className="h-6 w-3/4 rounded bg-gray-300"></span>
                  </div>
                  <div className="flex animate-pulse flex-col gap-2 rounded-lg bg-gray-200 p-3 shadow-sm">
                    <span className="h-4 w-1/2 rounded bg-gray-300"></span>
                    <span className="h-6 w-3/4 rounded bg-gray-300"></span>
                  </div>
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-3 gap-4">
                  <div className="flex flex-col gap-2 rounded-lg bg-gray-100 p-3 shadow-sm">
                    <span className="text-sm text-gray-600">Clicks</span>
                    <span className="text-lg font-medium text-gray-500">
                      {link.clicks}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 rounded-lg bg-gray-100 p-3 shadow-sm">
                    <span className="text-sm text-gray-600">Signups</span>
                    <span className="text-lg font-medium text-gray-500">
                      {link.leads}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 rounded-lg bg-gray-100 p-3 shadow-sm">
                    <span className="text-sm text-gray-600">Total earned</span>
                    <span className="text-lg font-medium text-gray-500">
                      {currencyFormatter(link.saleAmount / 100, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
