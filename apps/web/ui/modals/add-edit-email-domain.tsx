import { clientAccessCheck } from "@/lib/api/tokens/permissions";
import useWorkspace from "@/lib/swr/use-workspace";
import { EmailDomainProps } from "@/lib/types";
import { Button, ButtonProps, Modal } from "@dub/ui";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { AddEditEmailDomainForm } from "../domains/add-edit-email-domain-form";

function AddEditEmailDomainModal({
  showAddEditDomainModal,
  setShowAddEditDomainModal,
  props,
}: {
  showAddEditDomainModal: boolean;
  setShowAddEditDomainModal: Dispatch<SetStateAction<boolean>>;
  props?: EmailDomainProps;
}) {
  return (
    <Modal
      showModal={showAddEditDomainModal}
      setShowModal={setShowAddEditDomainModal}
      drawerRootProps={{ repositionInputs: false }}
      className="max-h-[90vh] max-w-lg"
    >
      <h3 className="border-b border-neutral-200 px-4 py-4 text-lg font-medium sm:px-6">
        {props ? "Update" : "Add"} email domain
      </h3>
      <div className="flex-1 overflow-auto bg-neutral-50">
        <AddEditEmailDomainForm
          props={props}
          onSuccess={() => {
            setShowAddEditDomainModal(false);
          }}
          className="p-8"
        />
      </div>
    </Modal>
  );
}

function AddEmailDomainButton({
  setShowAddEditDomainModal,
  buttonProps,
}: {
  setShowAddEditDomainModal: Dispatch<SetStateAction<boolean>>;
  buttonProps?: Partial<ButtonProps>;
}) {
  const { role } = useWorkspace();

  const permissionsError = clientAccessCheck({
    action: "domains.write",
    role,
  }).error;

  return (
    <div>
      <Button
        text="Add email domain"
        disabledTooltip={permissionsError}
        onClick={() => setShowAddEditDomainModal(true)}
        {...buttonProps}
      />
    </div>
  );
}

export function useAddEditEmailDomainModal({
  props,
  buttonProps,
}: { props?: EmailDomainProps; buttonProps?: Partial<ButtonProps> } = {}) {
  const [showAddEditDomainModal, setShowAddEditDomainModal] = useState(false);

  const AddEditDomainModalCallback = useCallback(() => {
    return (
      <AddEditEmailDomainModal
        showAddEditDomainModal={showAddEditDomainModal}
        setShowAddEditDomainModal={setShowAddEditDomainModal}
        props={props}
      />
    );
  }, [showAddEditDomainModal, setShowAddEditDomainModal]);

  const AddDomainButtonCallback = useCallback(() => {
    return (
      <AddEmailDomainButton
        setShowAddEditDomainModal={setShowAddEditDomainModal}
        buttonProps={buttonProps}
      />
    );
  }, [setShowAddEditDomainModal, buttonProps]);

  return useMemo(
    () => ({
      setShowAddEditDomainModal,
      AddEditDomainModal: AddEditDomainModalCallback,
      AddDomainButton: AddDomainButtonCallback,
    }),
    [
      setShowAddEditDomainModal,
      AddEditDomainModalCallback,
      AddDomainButtonCallback,
    ],
  );
}
