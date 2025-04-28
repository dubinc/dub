import { clientAccessCheck } from "@/lib/api/tokens/permissions";
import useWorkspace from "@/lib/swr/use-workspace";
import { DomainProps } from "@/lib/types";
import { AddEditDomainForm } from "@/ui/domains/add-edit-domain-form";
import { Button, ButtonProps, Modal, TooltipContent } from "@dub/ui";
import { capitalize, pluralize } from "@dub/utils";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";

function AddEditDomainModal({
  showAddEditDomainModal,
  setShowAddEditDomainModal,
  props,
  onSuccess,
}: {
  showAddEditDomainModal: boolean;
  setShowAddEditDomainModal: Dispatch<SetStateAction<boolean>>;
  props?: DomainProps;
  onSuccess?: (domain: DomainProps) => void;
}) {
  return (
    <Modal
      showModal={showAddEditDomainModal}
      setShowModal={setShowAddEditDomainModal}
      drawerRootProps={{ repositionInputs: false }}
      className="max-h-[90vh] max-w-lg"
    >
      <h3 className="border-b border-neutral-200 px-4 py-4 text-lg font-medium sm:px-6">
        {props ? "Update" : "Add"} Domain
      </h3>
      <div className="flex-1 overflow-auto bg-neutral-50">
        <AddEditDomainForm
          props={props}
          onSuccess={(domain) => {
            setShowAddEditDomainModal(false);
            onSuccess?.(domain);
          }}
          className="p-8"
        />
      </div>
    </Modal>
  );
}

function AddDomainButton({
  setShowAddEditDomainModal,
  buttonProps,
}: {
  setShowAddEditDomainModal: Dispatch<SetStateAction<boolean>>;
  buttonProps?: Partial<ButtonProps>;
}) {
  const { slug, plan, role, domainsLimit, exceededDomains } = useWorkspace();

  const permissionsError = clientAccessCheck({
    action: "domains.write",
    role,
  }).error;

  return (
    <div>
      <Button
        text="Add Domain"
        disabledTooltip={
          exceededDomains ? (
            <TooltipContent
              title={`You can only add up to ${domainsLimit} ${pluralize("domain", domainsLimit || 0)} on the ${capitalize(plan)} plan. Upgrade to add more domains`}
              cta="Upgrade"
              href={`/${slug}/upgrade`}
            />
          ) : (
            permissionsError || undefined
          )
        }
        onClick={() => setShowAddEditDomainModal(true)}
        {...buttonProps}
      />
    </div>
  );
}

export function useAddEditDomainModal({
  props,
  buttonProps,
  onSuccess,
}: {
  props?: DomainProps;
  buttonProps?: Partial<ButtonProps>;
  onSuccess?: (domain: DomainProps) => void;
} = {}) {
  const [showAddEditDomainModal, setShowAddEditDomainModal] = useState(false);

  const AddEditDomainModalCallback = useCallback(() => {
    return (
      <AddEditDomainModal
        showAddEditDomainModal={showAddEditDomainModal}
        setShowAddEditDomainModal={setShowAddEditDomainModal}
        props={props}
        onSuccess={onSuccess}
      />
    );
  }, [showAddEditDomainModal, setShowAddEditDomainModal]);

  const AddDomainButtonCallback = useCallback(() => {
    return (
      <AddDomainButton
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
