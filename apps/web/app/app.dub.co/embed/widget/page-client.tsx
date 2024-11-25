"use client";

import { PartnerSaleResponse } from "@/lib/types";
import {
  Button,
  Check2,
  Copy,
  LinkedIn,
  ToggleGroup,
  Twitter,
  useCopyToClipboard,
  Wordmark,
} from "@dub/ui";
import { EnvelopeArrowRight, GiftFill, QRCode } from "@dub/ui/src/icons";
import {
  currencyFormatter,
  fetcher,
  getPrettyUrl,
  nFormatter,
} from "@dub/utils";
import { Link, Program } from "@prisma/client";
import { CSSProperties, useState } from "react";
import useSWR from "swr";
import { LinkToken } from "../token";

type Tab = "invite" | "rewards";

export function EmbedWidgetPageClient({
  program,
  link,
  earnings,
  accentColor,
}: {
  program: Program;
  link: Link;
  earnings: number;
  accentColor: string;
}) {
  const [copied, copyToClipboard] = useCopyToClipboard();
  const [selectedTab, setSelectedTab] = useState<Tab>("invite");

  // TODO:
  // Add sales table

  const {
    data: sales,
    isLoading,
    error,
  } = useSWR<PartnerSaleResponse[]>(`/api/referrals/sales`, fetcher);

  const { data: salesCount } = useSWR<{ count: number }>(
    `/api/referrals/sales/count`,
    fetcher,
  );

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ "--accent-color": accentColor } as CSSProperties}
    >
      <div className="flex flex-col gap-2 rounded-lg rounded-b-none bg-[var(--accent-color,black)] p-5">
        <div className="w-fit rounded-full bg-white/20 p-3">
          <GiftFill className="size-5 text-white" />
        </div>
        <h2 className="mt-2 text-base font-semibold text-white">
          Refer a friend and earn
        </h2>

        <p className="text-sm text-white/80">
          Earn additional credits and cash when you refer a friend and they sign
          up for {program?.name}
        </p>
      </div>

      <div className="p-5">
        <ToggleGroup
          options={[
            { value: "invite", label: "Invite" },
            { value: "rewards", label: "Rewards" },
          ]}
          selected={selectedTab}
          selectAction={(option: Tab) => setSelectedTab(option)}
          className="grid grid-cols-2 border-transparent bg-neutral-100"
          optionClassName="w-full h-8 flex items-center justify-center font-medium"
          indicatorClassName="rounded-lg bg-white border border-neutral-100 shadow-sm"
        />

        <div className="mt-6">
          {selectedTab === "invite" && (
            <>
              <div className="flex flex-col gap-2">
                <span className="text-sm text-neutral-500">Invite link</span>
                <input
                  type="text"
                  readOnly
                  value={getPrettyUrl(link.shortLink)}
                  className="h-10 w-full rounded-md border border-neutral-300 px-3 text-center text-sm text-neutral-600 focus:border-gray-500 focus:outline-none focus:ring-gray-500"
                />

                <Button
                  icon={
                    copied ? (
                      <Check2 className="size-4" />
                    ) : (
                      <Copy className="size-4" />
                    )
                  }
                  text={copied ? "Copied link" : "Copy link"}
                  onClick={() => copyToClipboard(getPrettyUrl(link.shortLink))}
                  className="enabled:border-[var(--accent-color)] enabled:bg-[var(--accent-color)] enabled:hover:bg-[var(--accent-color)]"
                />
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2">
                {/* TODO: Add social sharing messages */}
                {[
                  {
                    title: "X",
                    icon: Twitter,
                    href: `https://x.com/intent/tweet?text=${encodeURIComponent(link.shortLink)}`,
                  },
                  {
                    title: "LinkedIn",
                    icon: LinkedIn,
                    href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link.shortLink)}`,
                  },
                  {
                    title: "Email",
                    icon: EnvelopeArrowRight,
                    href: `mailto:?subject=Check out this link&body=${encodeURIComponent(link.shortLink)}`,
                  },
                  {
                    title: "QR Code",
                    icon: QRCode,
                    href: `https://api.dub.co/qr?url=${link.shortLink}?qr=1`,
                  },
                ].map(({ title, href, icon: Icon }) => {
                  return (
                    <a
                      key={href}
                      href={href}
                      title={title}
                      target="_blank"
                      className="flex h-8 items-center justify-center rounded-md border border-neutral-300 text-neutral-800 transition-colors duration-75 hover:bg-neutral-50 active:bg-neutral-100"
                    >
                      <Icon className="size-4 text-neutral-800" />
                    </a>
                  );
                })}
              </div>
            </>
          )}

          {selectedTab === "rewards" && (
            <>
              <h2 className="text-sm font-semibold text-neutral-900">
                Activity
              </h2>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  { label: "Clicks", value: link.clicks },
                  { label: "Signups", value: link.leads },
                  { label: "Total earned", value: earnings },
                ].map(({ label, value }) => (
                  <div className="flex flex-col gap-1.5 rounded-lg bg-neutral-100 p-2 shadow-sm">
                    <span className="text-xs text-neutral-500">{label}</span>
                    <span className="text-sm font-semibold text-neutral-600">
                      {label === "Total earned"
                        ? currencyFormatter(value / 100, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : nFormatter(value)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
          <LinkToken />
        </div>
      </div>
      <div className="flex grow flex-col justify-end">
        <div className="flex items-center justify-center">
          <a
            href="https://d.to/conversions"
            target="_blank"
            className="flex items-center justify-center gap-1 rounded-lg bg-white p-2 pb-5 pt-2 transition-colors"
          >
            <p className="text-sm text-gray-700">Powered by</p>
            <Wordmark className="h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
