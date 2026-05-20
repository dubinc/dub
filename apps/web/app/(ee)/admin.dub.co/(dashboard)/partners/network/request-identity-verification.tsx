"use client";

import { AdminNetworkPartner } from "@/lib/types";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { Button, CopyButton } from "@dub/ui";
import { ShieldCheck } from "@dub/ui/icons";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export function NetworkRequestIdentityVerification({
  partner,
}: {
  partner: Pick<AdminNetworkPartner, "id">;
}) {
  const [sessionUrl, setSessionUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const partnerIdRef = useRef(partner.id);

  useEffect(() => {
    partnerIdRef.current = partner.id;
    setSessionUrl(null);
    setIsLoading(false);
  }, [partner.id]);

  const handleGenerateSession = async () => {
    const requestPartnerId = partner.id;
    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/admin/partners/${requestPartnerId}/identity-verification`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        throw new Error(
          (await response.text()) || "Failed to generate Veriff session.",
        );
      }

      const { sessionUrl: url } = (await response.json()) as {
        sessionUrl: string;
      };

      if (partnerIdRef.current !== requestPartnerId) {
        return;
      }

      setSessionUrl(url);
      toast.success("Veriff session generated.");
    } catch (error) {
      if (partnerIdRef.current !== requestPartnerId) {
        return;
      }

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to generate Veriff session.",
      );
    } finally {
      if (partnerIdRef.current === requestPartnerId) {
        setIsLoading(false);
      }
    }
  };

  const { setShowConfirmModal, confirmModal } = useConfirmModal({
    title: "Request identity verification",
    description:
      "This will trigger a new Veriff verification session for the partner.",
    confirmText: "Generate session",
    onConfirm: handleGenerateSession,
  });

  return (
    <>
      {confirmModal}
      <section className="w-full min-w-0 max-w-full overflow-x-hidden rounded-xl border border-neutral-200 bg-neutral-100 p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-neutral-500" />
          <h3 className="text-sm font-semibold text-neutral-900">
            Request identity verification
          </h3>
        </div>

        <p className="mt-1 text-xs text-neutral-500">
          This will trigger a new verification process for the partner.
        </p>

        {sessionUrl ? (
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2">
            <a
              href={sessionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 flex-1 truncate text-xs text-blue-600 underline-offset-2 hover:underline"
            >
              {sessionUrl}
            </a>
            <CopyButton
              value={sessionUrl}
              variant="neutral"
              className="shrink-0 p-1 [&>*]:h-3 [&>*]:w-3"
              successMessage="Copied verification URL to clipboard!"
            />
          </div>
        ) : (
          <Button
            variant="secondary"
            text="Generate Veriff Session"
            className="mt-2"
            loading={isLoading}
            onClick={() => setShowConfirmModal(true)}
          />
        )}
      </section>
    </>
  );
}
