"use client";

import { AdminNetworkPartner } from "@/lib/types";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { PartnerAvatar } from "@/ui/partners/partner-avatar";
import { PartnerStatusBadges } from "@/ui/partners/partner-status-badges";
import { SearchBox } from "@/ui/shared/search-box";
import { Button, LoadingSpinner, Sheet, StatusBadge } from "@dub/ui";
import { Xmark } from "@dub/ui/icons";
import { fetcher, OG_AVATAR_URL } from "@dub/utils";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";

import { MAX_FRAUD_REASON_LENGTH } from "@/lib/zod/schemas/partners";

export function FlagPartnerFraudSheet({
  isOpen,
  setIsOpen,
  onFlagged,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onFlagged: () => Promise<void>;
}) {
  return (
    <Sheet
      open={isOpen}
      onOpenChange={setIsOpen}
      contentProps={{
        className: "[--sheet-width:520px]",
      }}
    >
      {isOpen && (
        <FlagPartnerFraudSheetContent
          setIsOpen={setIsOpen}
          onFlagged={onFlagged}
        />
      )}
    </Sheet>
  );
}

function FlagPartnerFraudSheetContent({
  setIsOpen,
  onFlagged,
}: {
  setIsOpen: (open: boolean) => void;
  onFlagged: () => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [reason, setReason] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmedSearch = debouncedSearch.trim();
  const canSearch =
    trimmedSearch.length > 0 &&
    (trimmedSearch.startsWith("pn_") || trimmedSearch.includes("@"));

  const {
    data: partners,
    isLoading: isSearching,
    error: searchError,
  } = useSWR<AdminNetworkPartner[]>(
    canSearch
      ? `/api/admin/partners/network?search=${encodeURIComponent(trimmedSearch)}&pageSize=1`
      : null,
    fetcher,
  );

  const partner = partners?.[0];
  const partnerNotFound = canSearch && !isSearching && partners?.length === 0;

  const handleFlag = useCallback(async () => {
    if (!partner) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/admin/partners/${partner.id}/flag-fraud`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reason,
            reviewNote: reviewNote.trim() || undefined,
          }),
        },
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text);
      }

      const { alertedProgramsCount } = await response.json();

      toast.success(
        alertedProgramsCount > 0
          ? `Fraud confirmed. ${alertedProgramsCount} program${alertedProgramsCount === 1 ? "" : "s"} alerted.`
          : "Fraud confirmed. No other enrolled programs to alert.",
      );

      setSearch("");
      setDebouncedSearch("");
      setReason("");
      setReviewNote("");
      setIsOpen(false);
      await onFlagged();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [partner, reason, reviewNote, setIsOpen, onFlagged]);

  const { setShowConfirmModal, confirmModal } = useConfirmModal({
    title: "Confirm fraud",
    description:
      "This will confirm fraud for this partner and alert their enrolled programs through the network-level ban risk rule. This action cannot be undone.",
    confirmText: "Confirm Fraud",
    confirmVariant: "danger",
    onConfirm: handleFlag,
  });

  const canSubmit = partner && reason.trim().length > 0 && !isSubmitting;

  return (
    <div className="flex size-full flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 px-6">
        <Sheet.Title>Flag Partner</Sheet.Title>
        <Sheet.Close asChild>
          <Button
            variant="outline"
            icon={<Xmark className="size-5" />}
            className="h-auto w-fit p-1"
          />
        </Sheet.Close>
      </div>

      <div className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
        <div className="flex flex-col gap-6">
          <div>
            <label className="block text-sm font-medium text-neutral-900">
              Partner
            </label>
            <p className="mt-1 text-xs text-neutral-500">
              Search by partner email or ID (pn_...)
            </p>
            <div className="mt-2">
              <SearchBox
                value={search}
                onChange={setSearch}
                onChangeDebounced={setDebouncedSearch}
                loading={isSearching}
                placeholder="Search by partner email or ID"
                inputClassName="w-full"
              />
            </div>
            {isSearching && (
              <div className="mt-3 flex h-16 items-center justify-center rounded-lg border border-neutral-200">
                <LoadingSpinner />
              </div>
            )}
            {searchError && (
              <p className="mt-2 text-sm text-red-600">
                Failed to search partners.
              </p>
            )}
            {partnerNotFound && (
              <p className="mt-2 text-sm text-neutral-500">
                No partner found for this search.
              </p>
            )}
            {partner && (
              <div className="mt-3 rounded-lg border border-neutral-200 p-3">
                <div className="flex items-center gap-3">
                  <PartnerAvatar partner={partner} className="size-10" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-neutral-900">
                      {partner.name}
                    </p>
                    <p className="truncate text-xs text-neutral-500">
                      {partner.email}
                    </p>
                  </div>
                </div>
                {partner.programs.length > 0 && (
                  <div className="mt-3 border-t border-neutral-100 pt-3">
                    <p className="text-xs font-medium text-neutral-500">
                      Enrolled programs
                    </p>
                    <ul className="mt-2 flex flex-col gap-2">
                      {partner.programs.map((program) => (
                        <li
                          key={program.id}
                          className="flex items-center justify-between gap-2"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <img
                              src={
                                program.logo ||
                                `${OG_AVATAR_URL}${program.name}`
                              }
                              alt={program.name}
                              className="size-4 rounded-full"
                            />
                            <span className="truncate text-sm text-neutral-700">
                              {program.name}
                            </span>
                          </div>
                          <StatusBadge
                            variant={
                              PartnerStatusBadges[program.status]?.variant ??
                              "neutral"
                            }
                          >
                            {PartnerStatusBadges[program.status]?.label ??
                              program.status}
                          </StatusBadge>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-900">
              Fraud reason
            </label>
            <textarea
              className="mt-1.5 block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
              placeholder="Describe why this partner is suspected of fraud..."
              rows={4}
              maxLength={MAX_FRAUD_REASON_LENGTH}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <p className="mt-1 text-right text-xs text-neutral-400">
              {reason.length}/{MAX_FRAUD_REASON_LENGTH}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-900">
              Review note{" "}
              <span className="font-normal text-neutral-400">(optional)</span>
            </label>
            <textarea
              className="mt-1.5 block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
              placeholder="Add an internal note about this review..."
              rows={3}
              maxLength={MAX_FRAUD_REASON_LENGTH}
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
            />
            <p className="mt-1 text-right text-xs text-neutral-400">
              {reviewNote.length}/{MAX_FRAUD_REASON_LENGTH}
            </p>
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-neutral-200 p-6">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="secondary"
            className="h-8 w-fit px-3"
            text="Cancel"
            onClick={() => setIsOpen(false)}
          />
          <Button
            variant="danger"
            className="h-8 w-fit px-3"
            text="Confirm Fraud"
            disabled={!canSubmit}
            loading={isSubmitting}
            onClick={() => setShowConfirmModal(true)}
          />
        </div>
      </div>

      {confirmModal}
    </div>
  );
}
