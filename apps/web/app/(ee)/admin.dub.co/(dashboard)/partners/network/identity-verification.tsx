"use client";

import { AdminNetworkPartner } from "@/lib/types";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { Button, CopyButton } from "@dub/ui";
import { ShieldCheck, Veriff, VerifiedBadge } from "@dub/ui/icons";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export function NetworkIdentityVerification({
  partner,
}: {
  partner: Pick<AdminNetworkPartner, "id" | "identityVerifiedAt">;
}) {
  const [sessionUrl, setSessionUrl] = useState<string | null>(null);
  const [isGeneratingSession, setIsGeneratingSession] = useState(false);
  const [isVerifyingIdentity, setIsVerifyingIdentity] = useState(false);
  const partnerIdRef = useRef(partner.id);

  useEffect(() => {
    partnerIdRef.current = partner.id;
    setSessionUrl(null);
    setIsGeneratingSession(false);
    setIsVerifyingIdentity(false);
  }, [partner.id]);

  const handleGenerateSession = async () => {
    const requestPartnerId = partner.id;
    setIsGeneratingSession(true);

    try {
      const response = await fetch(
        `/api/admin/partners/${requestPartnerId}/generate-veriff-session`,
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
        setIsGeneratingSession(false);
      }
    }
  };

  const handleVerifyIdentity = async () => {
    const requestPartnerId = partner.id;
    setIsVerifyingIdentity(true);

    try {
      const response = await fetch(
        `/api/admin/partners/${requestPartnerId}/verify-identity`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        throw new Error(
          (await response.text()) || "Failed to verify partner identity.",
        );
      }

      if (partnerIdRef.current !== requestPartnerId) {
        return;
      }

      toast.success("Partner identity verified.");
    } catch (error) {
      if (partnerIdRef.current !== requestPartnerId) {
        return;
      }

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to verify partner identity.",
      );
    } finally {
      if (partnerIdRef.current === requestPartnerId) {
        setIsVerifyingIdentity(false);
      }
    }
  };

  const { setShowConfirmModal: setShowGenerateSessionModal, confirmModal } =
    useConfirmModal({
      title: "Identity verification",
      description:
        "This will trigger a new Veriff session URL that you can send to the partner. Are you sure you want to proceed?",
      confirmText: "Generate session",
      onConfirm: handleGenerateSession,
    });

  const {
    setShowConfirmModal: setShowVerifyIdentityModal,
    confirmModal: verifyIdentityConfirmModal,
  } = useConfirmModal({
    title: "Identity verification",
    description:
      "This will manually verify the partner's identity (for partners with US LLC). Are you sure you want to proceed?",
    confirmText: "Verify identity",
    onConfirm: handleVerifyIdentity,
  });

  return (
    <>
      {confirmModal}
      {verifyIdentityConfirmModal}
      <section className="w-full min-w-0 max-w-full overflow-x-hidden rounded-xl border border-neutral-200 bg-neutral-100 p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-neutral-500" />
          <h3 className="text-sm font-semibold text-neutral-900">
            Identity verification
          </h3>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            text="Generate Veriff Session"
            loading={isGeneratingSession}
            className="h-8"
            icon={<Veriff className="size-4" />}
            onClick={() => setShowGenerateSessionModal(true)}
          />
          <Button
            variant="secondary"
            text="Verify identity"
            loading={isVerifyingIdentity}
            className="h-8"
            icon={<VerifiedBadge className="size-4" />}
            disabledTooltip={
              partner.identityVerifiedAt !== null
                ? "Identity already verified"
                : undefined
            }
            onClick={() => setShowVerifyIdentityModal(true)}
          />
        </div>

        {sessionUrl && (
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
        )}
      </section>
    </>
  );
}
