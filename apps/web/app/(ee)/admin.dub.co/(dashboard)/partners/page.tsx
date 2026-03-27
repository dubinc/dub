"use client";

import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { PartnerAvatar } from "@/ui/partners/partner-avatar";
import { Button, CopyText, TimestampTooltip } from "@dub/ui";
import { Xmark } from "@dub/ui/icons";
import { cn, fetcher, formatDateSmart } from "@dub/utils";
import { FormEvent, useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";

type TrustedPartner = {
  id: string;
  name: string;
  email: string | null;
  image: string | null;
  trustedAt: Date;
};

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

  const { data, isLoading, mutate } = useSWR<{ partners: TrustedPartner[] }>(
    "/api/admin/partners",
    fetcher,
    { keepPreviousData: true },
  );

  const trustedPartners = data?.partners ?? [];

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
                <div className="flex items-start gap-3 px-4 py-3.5 sm:px-5 md:items-center">
                  <PartnerAvatar
                    partner={partner}
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
                    {partner.email ? (
                      <CopyText
                        value={partner.email}
                        className="truncate text-sm text-neutral-500"
                      >
                        {partner.email}
                      </CopyText>
                    ) : null}
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
                      onClick={() => openRemoveModal(partner)}
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
    </div>
  );
}
