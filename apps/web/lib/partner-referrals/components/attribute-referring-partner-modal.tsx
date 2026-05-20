"use client";

import { parseActionError } from "@/lib/actions/parse-action-errors";
import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps } from "@/lib/types";
import { PartnerAvatar } from "@/ui/partners/partner-avatar";
import {
  PartnerSelector,
  SelectedPartner,
} from "@/ui/partners/partner-selector";
import { Markdown } from "@/ui/shared/markdown";
import { Button, Modal, Switch } from "@dub/ui";
import { currencyFormatter } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { attributeReferringPartnerAction } from "../attribute-referring-partner";

function AttributeReferringPartnerModal({
  showModal,
  setShowModal,
  partner,
}: {
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  partner: Pick<
    EnrolledPartnerProps,
    "id" | "name" | "email" | "image" | "groupId" | "totalCommissions"
  >;
}) {
  const { id: workspaceId } = useWorkspace();

  const [referredByPartner, setReferredByPartner] =
    useState<SelectedPartner | null>(null);

  const [createCommissionsForPastEvents, setCreateCommissionsForPastEvents] =
    useState(false);

  const { executeAsync, isPending } = useAction(
    attributeReferringPartnerAction,
    {
      onSuccess: async () => {
        await mutatePrefix("/api/partners");
        toast.success("Referring partner attributed successfully!");
        setShowModal(false);
      },
      onError({ error }) {
        toast.error(parseActionError(error));
      },
    },
  );

  const onSubmit = useCallback(async () => {
    if (!workspaceId || !referredByPartner?.id) return;

    await executeAsync({
      workspaceId,
      partnerId: partner.id,
      referredByPartnerId: referredByPartner?.id,
      createCommissionsForPastEvents,
    });
  }, [
    executeAsync,
    workspaceId,
    partner.id,
    referredByPartner?.id,
    createCommissionsForPastEvents,
  ]);

  const disabledTooltip = !referredByPartner?.id
    ? "Please select a referring partner first."
    : partner.id === referredByPartner?.id
      ? "You cannot attribute a partner to themselves."
      : undefined;

  return (
    <Modal showModal={showModal} setShowModal={setShowModal}>
      <div className="border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">
          Attribute referring partner
        </h3>
      </div>

      <div className="flex flex-col gap-6 bg-neutral-50 p-4 sm:p-6">
        <Markdown className="text-sm font-normal leading-5 text-neutral-600">
          Attribute this partner to the partner who referred them and generate
          eligible referral rewards. [Learn
          more](https://dub.co/help/article/partner-referrals#manually-attribute-referring-partner)
        </Markdown>

        <div className="rounded-lg border border-neutral-200 bg-neutral-100 p-3">
          <div className="flex items-center gap-4">
            <PartnerAvatar partner={partner} className="size-10 bg-white" />
            <div className="flex min-w-0 flex-col">
              <h4 className="truncate text-sm font-medium text-neutral-900">
                {partner.name}
              </h4>
              <p className="truncate text-xs text-neutral-500">
                {partner.email}
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-900">
            Referring partner
          </label>
          <div className="mt-1.5">
            <PartnerSelector
              selectedPartnerId={referredByPartner?.id || null}
              setSelectedPartnerId={() => {}}
              onSelectedPartner={setReferredByPartner}
            />
          </div>
        </div>

        <div>
          <div className="flex items-start gap-3">
            <Switch
              checked={createCommissionsForPastEvents}
              fn={setCreateCommissionsForPastEvents}
              disabledTooltip={disabledTooltip}
            />

            <div className="-mt-0.5 space-y-1">
              <p className="text-sm font-medium text-neutral-800">
                Create commissions for eligible past events
              </p>

              {createCommissionsForPastEvents && (
                <p className="text-content-subtle text-sm">
                  This will generate partner referral commissions for{" "}
                  <span className="font-semibold text-neutral-900">
                    {referredByPartner?.name}
                  </span>{" "}
                  based on all of{" "}
                  <span className="font-semibold text-neutral-900">
                    {partner.name}
                  </span>
                  's historical commissions (
                  <span className="font-semibold text-neutral-900">
                    Total:
                    {currencyFormatter(partner.totalCommissions)}
                  </span>
                  )
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="border-border-subtle flex items-center justify-end gap-2 border-t px-4 py-4">
        <Button
          onClick={() => setShowModal(false)}
          variant="secondary"
          text="Cancel"
          className="h-8 w-fit px-3"
          disabled={isPending}
        />
        <Button
          onClick={onSubmit}
          variant="primary"
          text="Attribute partner"
          loading={isPending}
          disabledTooltip={disabledTooltip}
          className="h-8 w-fit px-3"
        />
      </div>
    </Modal>
  );
}

export function useAttributeReferringPartnerModal({
  partner,
}: {
  partner: Pick<
    EnrolledPartnerProps,
    "id" | "name" | "email" | "image" | "groupId" | "totalCommissions"
  >;
}) {
  const [showModal, setShowModal] = useState(false);

  const AttributeReferringPartnerModalCallback = useCallback(() => {
    return (
      <AttributeReferringPartnerModal
        showModal={showModal}
        setShowModal={setShowModal}
        partner={partner}
      />
    );
  }, [showModal, setShowModal, partner]);

  return useMemo(
    () => ({
      setShowAttributeReferringPartnerModal: setShowModal,
      AttributeReferringPartnerModal: AttributeReferringPartnerModalCallback,
    }),
    [setShowModal, AttributeReferringPartnerModalCallback],
  );
}
