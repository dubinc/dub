"use client";

import { PARTNER_PLATFORM_FIELDS } from "@/lib/partners/partner-platforms";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { PartnerAvatar } from "@/ui/partners/partner-avatar";
import { PlatformType } from "@dub/prisma/client";
import { Button, CopyText, Sheet, TimestampTooltip, Tooltip } from "@dub/ui";
import {
  BadgeCheck2Fill,
  Instagram,
  LinkedIn,
  TikTok,
  Twitter,
  Xmark,
  YouTube,
} from "@dub/ui/icons";
import { cn, fetcher, formatDateSmart } from "@dub/utils";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";

type TrustedPartner = {
  id: string;
  name: string;
  email: string | null;
  image: string | null;
  trustedAt: Date;
  description?: string | null;
  platforms: Array<{
    type: PlatformType;
    identifier: string;
    verifiedAt: Date | string | null;
    subscribers: number;
    posts: number;
    views: number;
  }>;
};

const PLATFORM_ORDER: PlatformType[] = [
  "youtube",
  "twitter",
  "linkedin",
  "instagram",
  "tiktok",
  "website",
];

const PLATFORM_LABELS: Record<PlatformType, string> = {
  website: "Website",
  youtube: "YouTube",
  twitter: "X / Twitter",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  tiktok: "TikTok",
};

const PLATFORM_PLACEHOLDERS: Record<PlatformType, string> = {
  website: "https://example.com",
  youtube: "@creator or channel URL",
  twitter: "@handle or profile URL",
  linkedin: "profile slug or URL",
  instagram: "@handle or profile URL",
  tiktok: "@handle or profile URL",
};

const formatInt = (value: number) =>
  new Intl.NumberFormat("en-US").format(value);

function PlatformIcon({ platform }: { platform: PlatformType }) {
  const className = "size-4";
  if (platform === "youtube") return <YouTube className={className} />;
  if (platform === "twitter") return <Twitter className={className} />;
  if (platform === "linkedin") return <LinkedIn className={className} />;
  if (platform === "instagram") return <Instagram className={className} />;
  if (platform === "tiktok") return <TikTok className={className} />;
  return <span className="text-xs text-neutral-500">WEB</span>;
}

function TrustedAtLabel({
  trustedAt,
  className,
}: {
  trustedAt: Date | string;
  className?: string;
}) {
  return (
    <TimestampTooltip
      timestamp={trustedAt}
      rows={["local", "utc", "unix"]}
      side="left"
    >
      <div
        className={cn(
          "cursor-default whitespace-nowrap text-xs tabular-nums text-neutral-400 underline decoration-neutral-300 decoration-dotted underline-offset-2",
          className,
        )}
      >
        Trusted {formatDateSmart(trustedAt)}
      </div>
    </TimestampTooltip>
  );
}

export default function PartnersPage() {
  const [partnerIdOrEmail, setPartnerIdOrEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [partnerToRemove, setPartnerToRemove] = useState<TrustedPartner | null>(
    null,
  );
  const [activePartner, setActivePartner] = useState<TrustedPartner | null>(
    null,
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draftHandles, setDraftHandles] = useState<
    Partial<Record<PlatformType, string>>
  >({});
  const [linkedInPostUrls, setLinkedInPostUrls] = useState<
    Partial<Record<PlatformType, string>>
  >({});
  const [verifyingPlatforms, setVerifyingPlatforms] = useState<
    Partial<Record<PlatformType, boolean>>
  >({});

  const { data, isLoading, mutate } = useSWR<{ partners: TrustedPartner[] }>(
    "/api/admin/partners",
    fetcher,
    { keepPreviousData: true },
  );

  const trustedPartners = data?.partners ?? [];
  const platformByType = useMemo(
    () =>
      Object.fromEntries(
        (activePartner?.platforms ?? []).map((platform) => [
          platform.type,
          platform,
        ]),
      ) as Partial<Record<PlatformType, TrustedPartner["platforms"][number]>>,
    [activePartner?.platforms],
  );

  useEffect(() => {
    if (!activePartner) return;
    const nextDraftHandles: Partial<Record<PlatformType, string>> = {};
    for (const platform of PLATFORM_ORDER) {
      nextDraftHandles[platform] = platformByType[platform]?.identifier ?? "";
    }
    setDraftHandles(nextDraftHandles);
    setLinkedInPostUrls({});
  }, [activePartner, platformByType]);

  const { setShowConfirmModal, confirmModal } = useConfirmModal({
    title: "Remove trusted partner",
    description: partnerToRemove ? (
      <>
        Remove{" "}
        <span className="font-medium text-neutral-900">
          {partnerToRemove.name}
        </span>{" "}
        from the trusted partners list? They will no longer show the trusted
        badge in the partner network.
      </>
    ) : null,
    confirmText: "Remove",
    confirmVariant: "danger",
    cancelText: "Cancel",
    onCancel: () => setPartnerToRemove(null),
    onConfirm: async () => {
      if (!partnerToRemove) return;

      const res = await fetch("/api/admin/partners", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId: partnerToRemove.id }),
      });

      if (!res.ok) {
        const message = await res.text();
        toast.error(message || "Failed to remove trusted partner.");
        throw new Error(message);
      }

      await mutate();
      toast.success("Partner removed from trusted partners.");
      setPartnerToRemove(null);
    },
  });

  const openRemoveModal = useCallback(
    (partner: TrustedPartner) => {
      setPartnerToRemove(partner);
      setShowConfirmModal(true);
    },
    [setShowConfirmModal],
  );

  const submitDisabled = useMemo(
    () => isSubmitting || partnerIdOrEmail.trim().length === 0,
    [isSubmitting, partnerIdOrEmail],
  );

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedValue = partnerIdOrEmail.trim();
    if (!trimmedValue) return;

    setIsSubmitting(true);
    await fetch("/api/admin/partners", {
      method: "POST",
      body: JSON.stringify({
        partnerIdOrEmail: trimmedValue,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(await res.text());
        }
        await mutate();
        setPartnerIdOrEmail("");
        toast.success("Successfully marked partner as trusted.");
      })
      .catch((error) => {
        toast.error(error.message || "Failed to mark partner as trusted.");
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const verifyPlatform = async (platform: PlatformType) => {
    if (!activePartner) return;
    const identifier = draftHandles[platform]?.trim();
    if (!identifier) {
      toast.error(`Please enter a ${PLATFORM_LABELS[platform]} identifier.`);
      return;
    }

    setVerifyingPlatforms((prev) => ({ ...prev, [platform]: true }));

    const payload: {
      partnerId: string;
      platform: PlatformType;
      identifier: string;
      postUrl?: string;
    } = {
      partnerId: activePartner.id,
      platform,
      identifier,
    };

    const linkedInPostUrl = linkedInPostUrls.linkedin?.trim();
    if (platform === "linkedin" && linkedInPostUrl) {
      payload.postUrl = linkedInPostUrl;
    }

    await fetch("/api/admin/partners/platforms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(await res.text());
        }
        const refreshed = await mutate();
        const updatedActivePartner = refreshed?.partners?.find(
          (p) => p.id === activePartner.id,
        );
        if (updatedActivePartner) {
          setActivePartner(updatedActivePartner);
        }
        toast.success(`${PLATFORM_LABELS[platform]} verified manually.`);
      })
      .catch((error) => {
        toast.error(error.message || "Failed to verify platform.");
      })
      .finally(() => {
        setVerifyingPlatforms((prev) => ({ ...prev, [platform]: false }));
      });
  };

  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-6 p-6">
      {confirmModal}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
        <div className="mb-4">
          <h1 className="text-base font-semibold text-neutral-900">
            Trusted partners
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Add a partner by ID (e.g. pn_xxx) or email to mark them as trusted.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-2 sm:flex-row sm:items-center"
        >
          <input
            type="text"
            value={partnerIdOrEmail}
            onChange={(e) => setPartnerIdOrEmail(e.target.value)}
            placeholder="pn_123... or panic@thedis.co"
            className="w-full rounded-md border border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
          />
          <Button
            type="submit"
            text="Add partner"
            className="w-fit"
            loading={isSubmitting}
            disabled={submitDisabled}
          />
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        {isLoading ? (
          <div className="space-y-0 divide-y divide-neutral-100 px-4 py-2 sm:px-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 py-3.5">
                <div className="size-10 shrink-0 animate-pulse rounded-full bg-neutral-100" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 w-40 max-w-full animate-pulse rounded bg-neutral-100" />
                  <div className="h-3 w-56 max-w-full animate-pulse rounded bg-neutral-50" />
                </div>
              </div>
            ))}
          </div>
        ) : trustedPartners.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-neutral-500 sm:px-5">
            No trusted partners yet.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {trustedPartners.map((partner) => (
              <li key={partner.id}>
                <div
                  role="button"
                  tabIndex={0}
                  className="flex cursor-pointer items-start gap-3 px-4 py-3.5 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300 sm:px-5 md:items-center"
                  onClick={() => {
                    setActivePartner(partner);
                    setSheetOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setActivePartner(partner);
                      setSheetOpen(true);
                    }
                  }}
                >
                  <PartnerAvatar
                    partner={{
                      id: partner.id,
                      name: partner.name,
                      image: partner.image,
                    }}
                    className="size-10 shrink-0 border border-neutral-100 shadow-sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <p className="truncate text-sm font-medium text-neutral-900">
                        {partner.name}
                      </p>
                      ·
                      <CopyText
                        value={partner.id}
                        className="truncate font-mono text-xs text-neutral-500"
                      >
                        {partner.id}
                      </CopyText>
                    </div>
                    <div className="mt-1 flex flex-col gap-1 lg:flex-row lg:items-center lg:gap-3">
                      {partner.email ? (
                        <CopyText
                          value={partner.email}
                          className="w-fit truncate text-sm text-neutral-500"
                        >
                          {partner.email}
                        </CopyText>
                      ) : (
                        <span />
                      )}
                      <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
                        {(() => {
                          const platforms = partner.platforms.map((p) => ({
                            ...p,
                            platformId: null,
                            avatarUrl: null,
                            subscribers: BigInt(p.subscribers),
                            posts: BigInt(p.posts),
                            views: BigInt(p.views),
                            verifiedAt: p.verifiedAt
                              ? new Date(p.verifiedAt)
                              : null,
                          }));
                          return PARTNER_PLATFORM_FIELDS.map(
                            ({ label, icon: Icon, data: getPlatformData }) => {
                              const { value, href, verified } =
                                getPlatformData(platforms);
                              if (!value) return null;
                              return (
                                <Tooltip
                                  key={label}
                                  content={
                                    <Link
                                      href={href ?? "#"}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-neutral-700 hover:text-neutral-900"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Icon className="size-3 shrink-0" />
                                      <span>{value}</span>
                                      {verified && (
                                        <BadgeCheck2Fill className="size-3 text-green-600" />
                                      )}
                                    </Link>
                                  }
                                >
                                  <Link
                                    href={href ?? "#"}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="border-border-subtle hover:bg-bg-muted relative flex size-6 shrink-0 items-center justify-center rounded-full border"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Icon className="size-3" />
                                    <span className="sr-only">{label}</span>
                                    {verified && (
                                      <BadgeCheck2Fill className="absolute -right-1 -top-1 size-3 text-green-600" />
                                    )}
                                  </Link>
                                </Tooltip>
                              );
                            },
                          );
                        })()}
                      </div>
                    </div>
                    <TrustedAtLabel
                      trustedAt={partner.trustedAt}
                      className="mt-0.5 md:hidden"
                    />
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <TrustedAtLabel
                      trustedAt={partner.trustedAt}
                      className="hidden md:block"
                    />
                    <button
                      type="button"
                      aria-label={`Remove ${partner.name} from trusted partners`}
                      className={cn(
                        "shrink-0 rounded-md p-2 text-neutral-400 transition-colors",
                        "hover:bg-neutral-100 hover:text-neutral-700",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2",
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        openRemoveModal(partner);
                      }}
                    >
                      <Xmark className="size-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setActivePartner(null);
        }}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-6 py-4">
            <Sheet.Title className="text-lg font-semibold">
              Partner profile and platforms
            </Sheet.Title>
            <Sheet.Close asChild>
              <Button
                type="button"
                variant="outline"
                icon={<Xmark className="size-5" />}
                className="h-auto w-fit p-1"
              />
            </Sheet.Close>
          </div>

          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-6">
            {!activePartner ? null : (
              <>
                <div className="rounded-xl border border-neutral-200 bg-white p-4">
                  <div className="flex items-start gap-3">
                    <img
                      src={activePartner.image || ""}
                      alt={activePartner.name}
                      className="size-12 shrink-0 rounded-full border border-neutral-100 bg-neutral-100 object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-neutral-900">
                        {activePartner.name}
                      </p>
                      <p className="truncate text-sm text-neutral-600">
                        {activePartner.email ?? "No email"}
                      </p>
                      {activePartner.description ? (
                        <p className="mt-1 line-clamp-3 text-sm text-neutral-500">
                          {activePartner.description}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {PLATFORM_ORDER.map((platform) => {
                    const existing = platformByType[platform];
                    const isVerifying = Boolean(verifyingPlatforms[platform]);
                    return (
                      <div
                        key={platform}
                        className="rounded-xl border border-neutral-200 bg-white p-4"
                      >
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <PlatformIcon platform={platform} />
                            <p className="text-sm font-medium text-neutral-900">
                              {PLATFORM_LABELS[platform]}
                            </p>
                          </div>
                          <div
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-medium",
                              existing?.verifiedAt
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-neutral-100 text-neutral-600",
                            )}
                          >
                            {existing?.verifiedAt ? "Verified" : "Not verified"}
                          </div>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                          <input
                            type="text"
                            value={draftHandles[platform] ?? ""}
                            onChange={(e) =>
                              setDraftHandles((prev) => ({
                                ...prev,
                                [platform]: e.target.value,
                              }))
                            }
                            placeholder={PLATFORM_PLACEHOLDERS[platform]}
                            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500"
                          />
                          <Button
                            type="button"
                            text="Verify"
                            className="w-fit"
                            loading={isVerifying}
                            onClick={() => verifyPlatform(platform)}
                          />
                        </div>

                        {platform === "linkedin" ? (
                          <input
                            type="text"
                            value={linkedInPostUrls.linkedin ?? ""}
                            onChange={(e) =>
                              setLinkedInPostUrls((prev) => ({
                                ...prev,
                                linkedin: e.target.value,
                              }))
                            }
                            placeholder="Optional: LinkedIn post URL (for follower metadata)"
                            className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500"
                          />
                        ) : null}

                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-neutral-500">
                          <span>
                            Subscribers: {formatInt(existing?.subscribers ?? 0)}
                          </span>
                          <span>Posts: {formatInt(existing?.posts ?? 0)}</span>
                          <span>Views: {formatInt(existing?.views ?? 0)}</span>
                          {existing?.verifiedAt ? (
                            <span>
                              Verified {formatDateSmart(existing.verifiedAt)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </Sheet>
    </div>
  );
}
