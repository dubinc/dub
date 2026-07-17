import { AccountInputGroup } from "@/ui/partners/merge-accounts/account-input-group";
import { Avatar, Button, Modal } from "@dub/ui";
import { ArrowDown } from "lucide-react";
import { Dispatch, SetStateAction, useState } from "react";

export type IdentitySyncField = "name" | "email" | "image";

export type IdentitySyncSnapshot = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  id?: string | null;
};

export function getIdentityDisplayFields(changedFields: IdentitySyncField[]) {
  const has = (field: IdentitySyncField) => changedFields.includes(field);

  return {
    showAvatar: has("image"),
    showName: has("name") || (has("image") && !has("email")),
    showEmail: has("email"),
    isNameContextOnly: has("image") && !has("name"),
  };
}

function IdentitySyncPreviewRow({
  snapshot,
  changedFields,
}: {
  snapshot: IdentitySyncSnapshot;
  changedFields: IdentitySyncField[];
}) {
  const { showAvatar, showName, showEmail, isNameContextOnly } =
    getIdentityDisplayFields(changedFields);

  const identifier =
    snapshot.id || snapshot.name || snapshot.email || "Unknown";

  if (!showAvatar && !showName && !showEmail) {
    return null;
  }

  return (
    <div className="flex items-center gap-4">
      {showAvatar && (
        <Avatar
          imageUrl={snapshot.image}
          identifier={identifier}
          className="size-12 object-cover"
        />
      )}
      <div>
        {showName && snapshot.name && (
          <div
            className={
              isNameContextOnly
                ? "text-[14px] font-semibold leading-4 text-neutral-900 opacity-50"
                : "text-[14px] font-semibold leading-4 text-neutral-900"
            }
          >
            {snapshot.name}
          </div>
        )}
        {showEmail && snapshot.email && (
          <div
            className={
              showName && snapshot.name
                ? "mt-1 text-sm font-medium leading-5 text-neutral-500"
                : "text-sm font-medium leading-5 text-neutral-900"
            }
          >
            {snapshot.email}
          </div>
        )}
      </div>
    </div>
  );
}

export function IdentitySyncConfirmContent({
  intro,
  changedFields,
  current,
  next,
}: {
  intro: string;
  changedFields: IdentitySyncField[];
  current: IdentitySyncSnapshot;
  next: IdentitySyncSnapshot;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-neutral-700">{intro}</p>

      <div className="flex flex-col gap-3">
        <AccountInputGroup title="Current">
          <IdentitySyncPreviewRow
            snapshot={current}
            changedFields={changedFields}
          />
        </AccountInputGroup>

        <ArrowDown className="ml-7 size-5 text-black" aria-hidden="true" />

        <AccountInputGroup title="New">
          <IdentitySyncPreviewRow
            snapshot={next}
            changedFields={changedFields}
          />
        </AccountInputGroup>
      </div>
    </div>
  );
}

type IdentitySyncConfirmModalProps = {
  title: string;
  intro: string;
  changedFields: IdentitySyncField[];
  current: IdentitySyncSnapshot;
  next: IdentitySyncSnapshot;
  onConfirm: () => Promise<void> | void;
  onCancel?: () => Promise<void> | void;
  onDismiss?: () => void;
};

function IdentitySyncConfirmModal({
  showModal,
  setShowModal,
  title,
  intro,
  changedFields,
  current,
  next,
  onConfirm,
  onCancel,
  onDismiss,
}: {
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
} & IdentitySyncConfirmModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      await onConfirm();
      setShowModal(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      await onCancel?.();
      setShowModal(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      showModal={showModal}
      setShowModal={setShowModal}
      onClose={onDismiss}
      preventDefaultClose={isLoading}
      className="max-w-md"
    >
      <div className="border-b border-neutral-200 px-4 py-3 sm:px-6 sm:py-4">
        <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
      </div>

      <div className="bg-neutral-50 p-4 sm:p-6">
        <IdentitySyncConfirmContent
          intro={intro}
          changedFields={changedFields}
          current={current}
          next={next}
        />
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-4 py-4 sm:px-6">
        <Button
          variant="secondary"
          className="h-8 w-fit px-3"
          text="Update this only"
          disabled={isLoading}
          onClick={handleCancel}
        />
        <Button
          variant="primary"
          className="h-8 w-fit px-3"
          text="Update both"
          loading={isLoading}
          onClick={handleConfirm}
        />
      </div>
    </Modal>
  );
}

export function useIdentitySyncConfirmModal(
  props: IdentitySyncConfirmModalProps,
) {
  const [showModal, setShowModal] = useState(false);

  return {
    setShowModal,
    confirmModal: (
      <IdentitySyncConfirmModal
        showModal={showModal}
        setShowModal={setShowModal}
        {...props}
      />
    ),
  };
}
