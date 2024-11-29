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
}: {
  showAddEditDomainModal: boolean;
  setShowAddEditDomainModal: Dispatch<SetStateAction<boolean>>;
  props?: DomainProps;
}) {
  return (
    <Modal
      showModal={showAddEditDomainModal} // TODO change back to showAddEditDomainModal
      setShowModal={setShowAddEditDomainModal}
      drawerRootProps={{ repositionInputs: false }}
      className="max-w-lg"
    >
      <h3 className="border-b border-gray-200 px-4 py-4 text-lg font-medium sm:px-6">
        {props ? "Edit" : "Add"} Domain
      </h3>
      <div className="bg-gray-50">
        <AddEditDomainForm
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
}: { props?: DomainProps; buttonProps?: Partial<ButtonProps> } = {}) {
  const [showAddEditDomainModal, setShowAddEditDomainModal] = useState(false);

  const AddEditDomainModalCallback = useCallback(() => {
    return (
      <AddEditDomainModal
        showAddEditDomainModal={showAddEditDomainModal}
        setShowAddEditDomainModal={setShowAddEditDomainModal}
        props={props}
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
