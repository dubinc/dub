"use client";

import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { PartnerAvatar } from "@/ui/partners/partner-avatar";
import { Button, CopyText } from "@dub/ui";
import { Xmark } from "@dub/ui/icons";
import { cn, fetcher, pluralize } from "@dub/utils";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";

type PostbackPartner = {
  id: string;
  name: string;
  email: string | null;
  image: string | null;
  postbackCount: number;
};

export default function PartnersPostbacksPage() {
  const [partnerIdOrEmail, setPartnerIdOrEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [partnerToRemove, setPartnerToRemove] =
    useState<PostbackPartner | null>(null);

  const { data, isLoading, mutate } = useSWR<{ partners: PostbackPartner[] }>(
    "/api/admin/partners/postbacks",
    fetcher,
    { keepPreviousData: true },
  );

  const partners = data?.partners ?? [];

  const { setShowConfirmModal, confirmModal } = useConfirmModal({
    title: "Revoke postback access",
    description: partnerToRemove ? (
      <>
        Revoke postback access for{" "}
        <span className="font-medium text-neutral-900">
          {partnerToRemove.name}
        </span>
        ? Their existing postback endpoints will also be disabled so deliveries
        stop.
      </>
    ) : null,
    confirmText: "Revoke access",
    confirmVariant: "danger",
    cancelText: "Cancel",
    onCancel: () => setPartnerToRemove(null),
    onConfirm: async () => {
      if (!partnerToRemove) return;

      const res = await fetch("/api/admin/partners/postbacks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId: partnerToRemove.id }),
      });

      if (!res.ok) {
        const message = await res.text();
        toast.error(message || "Failed to revoke postback access.");
        throw new Error(message);
      }

      await mutate();
      toast.success("Postback access revoked.");
      setPartnerToRemove(null);
    },
  });

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedValue = partnerIdOrEmail.trim();
    if (!trimmedValue) return;

    setIsSubmitting(true);
    await fetch("/api/admin/partners/postbacks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
        toast.success(
          "Postback access granted. Existing endpoints stay disabled until the partner re-enables them.",
        );
      })
      .catch((error) => {
        toast.error(error.message || "Failed to grant postback access.");
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  return (
    <>
      {confirmModal}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
        <div className="mb-4">
          <h1 className="text-base font-semibold text-neutral-900">
            Postback access
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Add a partner by ID (e.g. pn_xxx) or email to grant postback beta
            access. Revoking disables their endpoints; re-granting restores
            access but does not re-enable endpoints.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-2 sm:flex-row sm:items-center"
        >
          <label htmlFor="partner-id-or-email" className="sr-only">
            Partner ID or email
          </label>
          <input
            id="partner-id-or-email"
            type="text"
            value={partnerIdOrEmail}
            onChange={(e) => setPartnerIdOrEmail(e.target.value)}
            placeholder="pn_123... or panic@thedis.co"
            className="w-full rounded-md border border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
          />
          <Button
            type="submit"
            text="Grant access"
            className="w-fit"
            loading={isSubmitting}
            disabled={isSubmitting || partnerIdOrEmail.trim().length === 0}
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
        ) : partners.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-neutral-500 sm:px-5">
            No partners with postback access yet.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {partners.map((partner) => (
              <li key={partner.id}>
                <div className="flex items-start gap-3 px-4 py-3.5 sm:px-5 md:items-center">
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
                    <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                      {partner.email ? (
                        <CopyText
                          value={partner.email}
                          className="w-fit truncate text-sm text-neutral-500"
                        >
                          {partner.email}
                        </CopyText>
                      ) : (
                        <span className="text-sm text-neutral-400">
                          No email
                        </span>
                      )}
                      <span className="text-xs tabular-nums text-neutral-400">
                        {partner.postbackCount} active{" "}
                        {pluralize("postback", partner.postbackCount)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label={`Revoke postback access for ${partner.name}`}
                    className={cn(
                      "shrink-0 rounded-md p-2 text-neutral-400 transition-colors",
                      "hover:bg-neutral-100 hover:text-neutral-700",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2",
                    )}
                    onClick={() => {
                      setPartnerToRemove(partner);
                      setShowConfirmModal(true);
                    }}
                  >
                    <Xmark className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
