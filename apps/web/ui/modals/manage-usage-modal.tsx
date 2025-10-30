import useWorkspace from "@/lib/swr/use-workspace";
import { Modal, Slider, ToggleGroup } from "@dub/ui";
import { ENTERPRISE_PLAN, SELF_SERVE_PAID_PLANS } from "@dub/utils";
import NumberFlow from "@number-flow/react";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";

type ManageUsageModalProps = {
  type: "links" | "events";
  showManageUsageModal: boolean;
  setShowManageUsageModal: Dispatch<SetStateAction<boolean>>;
};

function ManageUsageModalContent({ type }: ManageUsageModalProps) {
  const workspace = useWorkspace();
  const { plan, planTier, usageLimit } = workspace;

  const usageSteps = useMemo(() => {
    const limitKey = { events: "clicks" }[type] ?? type;

    return [
      ...new Set(
        [...SELF_SERVE_PAID_PLANS, ENTERPRISE_PLAN]
          .flatMap((p) => [
            p.limits[limitKey],
            ...Object.values(p.tiers ?? {})?.map(
              ({ limits }) => limits[limitKey],
            ),
          ])
          .sort((a, b) => a - b),
      ),
    ];
  }, [usageLimit]);

  const defaultValue = useMemo(() => {
    const currentLimit =
      workspace[{ events: "usageLimit", clicks: "linksLimit" }[type]];
    return usageSteps.reduce((prev, curr) =>
      Math.abs(curr - currentLimit) < Math.abs(prev - currentLimit)
        ? curr
        : prev,
    );
  }, [usageSteps, workspace]);

  const [selectedValue, setSelectedValue] = useState<number | null>(null);
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");

  if (usageSteps.length < 2) return null;

  return (
    <div className="bg-neutral-50">
      <div className="border-b border-neutral-200 bg-white px-5 py-6">
        <h3 className="text-lg font-medium leading-none">Manage {type}</h3>
      </div>

      <div className="px-5 py-6">
        <p className="text-content-default text-sm font-medium">
          {{ events: "Events tracked per month" }[type] ??
            `New ${type} per month`}
        </p>
        <NumberFlow
          value={selectedValue ?? defaultValue}
          className="text-content-emphasis mb-4 text-lg font-semibold"
        />

        <Slider
          value={usageSteps.indexOf(selectedValue ?? defaultValue)}
          min={0}
          max={usageSteps.length - 1}
          onChange={(idx) => setSelectedValue(usageSteps[idx])}
          marks={usageSteps.map((_, idx) => idx)}
        />

        <div className="mt-6">
          <ToggleGroup
            options={[
              { value: "monthly", label: "Monthly" },
              {
                value: "yearly",
                label: "Yearly (2 months free)",
              },
            ]}
            className="flex overflow-hidden rounded-lg bg-transparent p-0.5"
            indicatorClassName="rounded-md bg-white shadow-md"
            optionClassName="text-xs py-2 px-5 normal-case grow justify-center text-center"
            selected={period}
            selectAction={(period) => setPeriod(period as "monthly" | "yearly")}
          />
        </div>
      </div>
    </div>
  );
}

function ManageUsageModal(props: ManageUsageModalProps) {
  return (
    <Modal
      showModal={props.showManageUsageModal}
      setShowModal={props.setShowManageUsageModal}
    >
      <ManageUsageModalContent {...props} />
    </Modal>
  );
}

export function useManageUsageModal(
  props: Omit<
    ManageUsageModalProps,
    "showManageUsageModal" | "setShowManageUsageModal"
  >,
) {
  const [showManageUsageModal, setShowManageUsageModal] = useState(false);

  const ManageUsageModalCallback = useCallback(() => {
    return (
      <ManageUsageModal
        showManageUsageModal={showManageUsageModal}
        setShowManageUsageModal={setShowManageUsageModal}
        {...props}
      />
    );
  }, [showManageUsageModal, setShowManageUsageModal]);

  return useMemo(
    () => ({
      setShowManageUsageModal,
      ManageUsageModal: ManageUsageModalCallback,
    }),
    [setShowManageUsageModal, ManageUsageModalCallback],
  );
}
