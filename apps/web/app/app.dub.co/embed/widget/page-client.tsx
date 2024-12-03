"use client";

import { PartnerSaleResponse } from "@/lib/types";
import {
  AnimatedSizeContainer,
  Button,
  LoadingSpinner,
  ToggleGroup,
  useCopyToClipboard,
  Wordmark,
} from "@dub/ui";
import {
  Check2,
  Copy,
  EnvelopeArrowRight,
  Gift,
  GiftFill,
  LinkedIn,
  QRCode,
  Twitter,
} from "@dub/ui/src/icons";
import {
  cn,
  currencyFormatter,
  fetcher,
  getPrettyUrl,
  nFormatter,
} from "@dub/utils";
import { Link, Program } from "@prisma/client";
import { motion } from "framer-motion";
import { CSSProperties, useState } from "react";
import useSWR from "swr";
import { LinkToken } from "../token";

type Tab = "invite" | "rewards";

const heroAnimationDuration = 0.2;

export function EmbedWidgetPageClient({
  program,
  link,
  earnings,
}: {
  program: Program;
  link: Link;
  earnings: number;
}) {
  const [copied, copyToClipboard] = useCopyToClipboard();
  const [selectedTab, setSelectedTab] = useState<Tab>("invite");

  const { data: sales, isLoading } = useSWR<PartnerSaleResponse[]>(
    "/api/embed/sales",
    fetcher,
  );

  return (
    <div
      className="flex min-h-screen flex-col"
      style={
        { "--accent-color": program.brandColor || "#171717" } as CSSProperties
      }
    >
      <div
        className={cn(
          "flex flex-col rounded-lg rounded-b-none bg-[var(--accent-color,black)]",
        )}
      >
        <AnimatedSizeContainer
          height
          transition={{ type: "easeInOut", duration: heroAnimationDuration }}
          className="flex flex-col justify-end"
        >
          <div className="flex h-full flex-col justify-end px-5 pt-5">
            <div
              className={cn(
                "mb-4 transition-opacity duration-200",
                selectedTab === "rewards" && "-mt-[3.75rem] opacity-0",
              )}
            >
              <div className="flex size-11 items-center justify-center rounded-full bg-white/20">
                <GiftFill className="size-5 shrink-0 text-white" />
              </div>
            </div>
            <h2 className="flex items-center text-base font-semibold text-white">
              <div
                className={cn(
                  "transition-[margin-left,opacity] duration-200",
                  selectedTab === "invite" && "-ml-10 opacity-0",
                )}
              >
                <div className="mr-2 flex size-8 items-center justify-center rounded-full bg-white/20">
                  <GiftFill className="size-4 shrink-0 text-white" />
                </div>
              </div>
              Refer a friend and earn
            </h2>
          </div>
        </AnimatedSizeContainer>
        <AnimatedSizeContainer
          height
          transition={{ type: "easeInOut", duration: heroAnimationDuration }}
        >
          <div
            className={cn(
              "px-5 pb-5 opacity-100 transition-opacity duration-200",
              selectedTab === "rewards" && "h-0 opacity-0",
            )}
          >
            <p className="pt-2 text-sm text-white/80">
              Earn additional credits and cash when you refer a friend and they
              sign up for {program?.name}
            </p>
          </div>
        </AnimatedSizeContainer>
      </div>

      <div className="p-5">
        <ToggleGroup
          options={[
            { value: "invite", label: "Invite" },
            {
              value: "rewards",
              label: "Rewards",
              badge:
                link.sales > 0 ? (
                  <div className="rounded bg-[var(--accent-color)] px-1.5 py-0.5 text-xs text-white">
                    {link.sales}
                  </div>
                ) : undefined,
            },
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
                  className="h-10 w-full rounded-md border border-neutral-300 px-3 text-center text-sm text-neutral-600 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500"
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
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                transition={{ duration: heroAnimationDuration }}
                className="overflow-clip"
              >
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[
                    { label: "Clicks", value: link.clicks },
                    { label: "Signups", value: link.leads },
                    { label: "Total earned", value: earnings },
                  ].map(({ label, value }) => (
                    <div className="flex flex-col gap-1.5 rounded-lg bg-neutral-100 p-2">
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
                <div className="mt-4">
                  {sales ? (
                    sales.length ? (
                      <div className="mt-4 grid grid-cols-1 divide-y divide-neutral-200 rounded-md border border-neutral-200">
                        {sales.slice(0, 3).map((sale) => (
                          <div
                            key={sale.id}
                            className="flex items-center justify-between gap-4 px-3 py-2.5"
                          >
                            <div className="flex min-w-0 flex-col">
                              <span className="truncate text-sm font-medium text-neutral-600">
                                {sale.customer.email}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-neutral-600">
                                {currencyFormatter(sale.earnings / 100, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState />
                    )
                  ) : isLoading ? (
                    <div className="mt-8 flex items-center justify-center">
                      <LoadingSpinner className="size-4" />
                    </div>
                  ) : (
                    <EmptyState />
                  )}
                </div>
              </motion.div>
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
            className="flex items-center justify-center gap-1 rounded-lg bg-white p-2 pb-2.5 transition-colors"
          >
            <p className="text-sm text-neutral-500">Powered by</p>
            <Wordmark className="h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}

const EmptyState = () => {
  return (
    <div className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50">
      <Gift className="size-6 text-neutral-400" />
      <p className="max-w-60 text-pretty text-center text-xs text-neutral-400">
        No sales yet. When you refer a friend and they make a purchase, they'll
        show up here.
      </p>
    </div>
  );
};
