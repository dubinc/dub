import { clientAccessCheck } from "@/lib/api/tokens/permissions";
import useWorkspace from "@/lib/swr/use-workspace";
import { DomainProps } from "@/lib/types";
import { AddEditDomainForm } from "@/ui/domains/add-edit-domain-form";
import {
  BlurImage,
  Button,
  ButtonProps,
  Logo,
  Modal,
  TooltipContent,
} from "@dub/ui";
import { capitalize } from "@dub/utils";
import { useParams } from "next/navigation";
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
  const { slug } = useParams() as { slug: string };
  const { logo } = useWorkspace();

  return (
    <Modal
      showModal={showAddEditDomainModal}
      setShowModal={setShowAddEditDomainModal}
      className="max-h-[95dvh]"
    >
      <div className="flex flex-col items-center justify-center gap-y-3 border-b border-gray-200 px-4 py-4 pt-8 sm:px-16">
        {logo ? (
          <BlurImage
            src={logo}
            alt={`Logo for ${slug}`}
            className="h-10 w-10 rounded-full border border-gray-200"
            width={20}
            height={20}
          />
        ) : (
          <Logo />
        )}
        <h1 className="text-lg font-medium">{props ? "Edit" : "Add"} Domain</h1>
      </div>

      <AddEditDomainForm
        props={props}
        onSuccess={() => {
          setShowAddEditDomainModal(false);
        }}
        className="bg-gray-50 px-4 py-8 sm:px-16"
      />
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
              title={`You can only add up to ${domainsLimit} domain${
                domainsLimit === 1 ? "" : "s"
              } on the ${capitalize(plan)} plan. Upgrade to add more domains`}
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
