"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { InvoiceProps } from "@/lib/types";
import { Button, LoadingSpinner, Modal } from "@dub/ui";
import { currencyFormatter } from "@dub/utils";
import Link from "next/link";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

function RetryPaymentModal({
  showModal,
  setShowModal,
}: {
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { id: workspaceId, slug, mutate } = useWorkspace();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceProps | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!showModal || !workspaceId) return;

    let cancelled = false;
    setIsLoadingInvoice(true);
    setInvoice(null);
    setLoadError(null);

    fetch(
      `/api/workspaces/${workspaceId}/billing/invoices?type=subscription&status=open`,
    )
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(
            body?.error?.message ?? "Failed to load open invoice.",
          );
        }
        const openInvoice = Array.isArray(body) ? body[0] : null;
        if (!cancelled) {
          setInvoice(openInvoice ?? null);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Failed to load open invoice.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingInvoice(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [showModal, workspaceId]);

  const handleConfirm = async () => {
    if (submittingRef.current || !workspaceId || !invoice) {
      return;
    }
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/billing/retry-payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ invoiceId: invoice.id }),
        },
      );
      if (res.ok) {
        toast.success("Payment succeeded.");
        // Hide the banner immediately; charge.succeeded / subscription webhooks clear paymentFailedAt in DB
        await mutate(
          (current) =>
            current ? { ...current, paymentFailedAt: null } : current,
          { revalidate: false },
        );
        setShowModal(false);
        return;
      }

      const body = await res.json().catch(() => null);
      toast.error(
        body?.error?.message ??
          "Failed to retry payment. Please update your payment method and try again.",
      );
    } catch (error) {
      console.error(error);
      toast.error(
        "Failed to retry payment. Please update your payment method and try again.",
      );
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      showModal={showModal}
      setShowModal={setShowModal}
      className="max-w-md"
    >
      <div className="sm:py-4.5 border-b border-neutral-200 px-4 py-3 sm:px-6">
        <h3 className="text-lg font-medium text-neutral-900">Retry payment</h3>
      </div>

      <div className="flex flex-col gap-4 bg-neutral-50 p-4 sm:p-6">
        {isLoadingInvoice ? (
          <div className="flex items-center justify-center py-6">
            <LoadingSpinner className="size-5" />
          </div>
        ) : loadError || !invoice ? (
          <div className="space-y-2 text-sm text-neutral-600">
            <p>{loadError ?? "No open invoice found to retry."}</p>
            {slug && (
              <p>
                You can{" "}
                <Link
                  href={`/${slug}/settings/billing#payment-methods`}
                  className="font-medium text-neutral-900 underline underline-offset-2"
                  onClick={() => setShowModal(false)}
                >
                  update your payment method
                </Link>{" "}
                instead.
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <p className="text-sm text-neutral-500">Amount due</p>
              <p className="mt-1 text-base font-semibold tabular-nums text-neutral-900">
                {currencyFormatter(invoice.total)}
              </p>
            </div>
            <p className="text-sm text-neutral-600">
              We&apos;ll charge your default payment method for this amount.
            </p>
          </>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-neutral-200 px-4 py-5 sm:px-6">
        <Button
          variant="secondary"
          className="h-8 rounded-lg px-3 text-sm"
          text="Cancel"
          onClick={() => setShowModal(false)}
          disabled={isSubmitting}
        />
        <Button
          variant="primary"
          className="h-8 rounded-lg px-3 text-sm"
          text="Retry payment"
          loading={isSubmitting}
          disabled={isSubmitting || isLoadingInvoice || !invoice}
          onClick={handleConfirm}
        />
      </div>
    </Modal>
  );
}

export function useRetryPaymentModal() {
  const [showModal, setShowModal] = useState(false);

  const RetryPaymentModalCallback = useCallback(() => {
    return (
      <RetryPaymentModal showModal={showModal} setShowModal={setShowModal} />
    );
  }, [showModal]);

  return useMemo(
    () => ({
      setShowRetryPaymentModal: setShowModal,
      RetryPaymentModal: RetryPaymentModalCallback,
    }),
    [setShowModal, RetryPaymentModalCallback],
  );
}
