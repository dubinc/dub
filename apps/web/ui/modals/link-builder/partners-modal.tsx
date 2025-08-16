import { LinkFormData } from "@/ui/links/link-builder/link-builder-provider";
import { PartnerSelector } from "@/ui/partners/partner-selector";
import { Button, Modal, Tooltip } from "@dub/ui";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { useForm, useFormContext } from "react-hook-form";

function PartnersModal({
  showPartnerModal,
  setShowPartnerModal,
}: {
  showPartnerModal: boolean;
  setShowPartnerModal: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <Modal
      showModal={showPartnerModal}
      setShowModal={setShowPartnerModal}
      className="sm:max-w-md"
    >
      <PartnerModalInner setShowPartnerModal={setShowPartnerModal} />
    </Modal>
  );
}

function PartnerModalInner({
  setShowPartnerModal,
}: {
  setShowPartnerModal: Dispatch<SetStateAction<boolean>>;
}) {
  const {
    watch: watchParent,
    getValues: getValuesParent,
    setValue: setValueParent,
  } = useFormContext<LinkFormData>();

  const {
    watch,
    setValue,
    reset,
    formState: { isDirty },
    handleSubmit,
  } = useForm<Pick<LinkFormData, "partnerId">>({
    values: {
      partnerId: getValuesParent("partnerId"),
    },
  });

  const parentPartnerId = watchParent("partnerId");
  const partnerId = watch("partnerId");

  return (
    <form
      className="px-5 py-4"
      onSubmit={(e) => {
        e.stopPropagation();
        handleSubmit((data) => {
          setValueParent("partnerId", data.partnerId, { shouldDirty: true });
          setShowPartnerModal(false);
        })(e);
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium">Assign to partner</h3>
        </div>
        <div className="max-md:hidden">
          <Tooltip
            content={
              <div className="px-2 py-1 text-xs text-neutral-700">
                Press{" "}
                <strong className="font-medium text-neutral-950">B</strong> to
                open this quickly
              </div>
            }
            side="right"
          >
            <kbd className="flex size-6 cursor-default items-center justify-center rounded-md border border-neutral-200 font-sans text-xs text-neutral-950">
              B
            </kbd>
          </Tooltip>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <span className="block text-sm font-medium text-neutral-900">
          Partner
        </span>

        <PartnerSelector
          selectedPartnerId={partnerId || null}
          setSelectedPartnerId={(id: string | null) =>
            setValue("partnerId", id, { shouldDirty: true })
          }
        />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div>
          {Boolean(parentPartnerId) && (
            <button
              type="button"
              className="text-xs font-medium text-neutral-700 transition-colors hover:text-neutral-950"
              onClick={() => {
                setValueParent("partnerId", null, { shouldDirty: true });
                setShowPartnerModal(false);
              }}
            >
              Remove partner
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            text="Cancel"
            className="h-9 w-fit"
            onClick={() => {
              reset();
              setShowPartnerModal(false);
            }}
          />
          <Button
            type="submit"
            variant="primary"
            text="Save"
            className="h-9 w-fit"
            disabled={!isDirty}
          />
        </div>
      </div>
    </form>
  );
}

export function usePartnersModal() {
  const [showPartnerModal, setShowPartnerModal] = useState(false);

  const PartnersModalCallback = useCallback(() => {
    return (
      <PartnersModal
        showPartnerModal={showPartnerModal}
        setShowPartnerModal={setShowPartnerModal}
      />
    );
  }, [showPartnerModal, setShowPartnerModal]);

  return useMemo(
    () => ({
      setShowPartnerModal,
      PartnersModal: PartnersModalCallback,
    }),
    [setShowPartnerModal, PartnersModalCallback],
  );
}
