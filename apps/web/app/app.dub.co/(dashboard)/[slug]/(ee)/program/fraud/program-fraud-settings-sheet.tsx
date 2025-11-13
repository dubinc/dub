"use client";

import { type FraudRuleProps } from "@/lib/fraud/types";
import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useWorkspace from "@/lib/swr/use-workspace";
import { X } from "@/ui/shared/icons";
import { FraudRiskLevel, FraudRuleType } from "@dub/prisma/client";
import { Button, Sheet, Switch } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { cn } from "@dub/utils/src";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";

type ProgramFraudSettingsSheetProps = {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
};

function ProgramFraudSettingsSheetContent({
  setIsOpen,
}: ProgramFraudSettingsSheetProps) {
  const { id: workspaceId } = useWorkspace();
  const [localRules, setLocalRules] = useState<Record<string, boolean>>({});
  const { isSubmitting, makeRequest } = useApiMutation();

  const { data: rules, isLoading } = useSWR<FraudRuleProps[]>(
    workspaceId ? `/api/fraud-rules?workspaceId=${workspaceId}` : null,
    fetcher,
  );

  // Initialize local rules state when data loads
  useEffect(() => {
    if (rules) {
      const initialState: Record<string, boolean> = {};

      rules.forEach((rule) => {
        initialState[rule.type] = rule.enabled;
      });

      setLocalRules(initialState);
    }
  }, [rules]);

  const handleToggle = (ruleType: FraudRuleType, enabled: boolean) => {
    setLocalRules((prev) => ({
      ...prev,
      [ruleType]: enabled,
    }));
  };

  const handleSubmit = async () => {
    const rules = Object.entries(localRules).map(([type, enabled]) => ({
      type,
      enabled,
    }));

    await makeRequest("/api/fraud-rules", {
      method: "PATCH",
      body: { rules },
      onSuccess: () => {
        toast.success("Fraud settings updated successfully.");
        setIsOpen(false);
        mutatePrefix("/api/fraud-rules");
      },
    });
  };

  const isDirty = useMemo(() => {
    if (!rules) return false;

    return rules.some((rule) => localRules[rule.type] !== rule.enabled);
  }, [rules, localRules]);

  // Group rules by risk level
  const rulesByRiskLevel = useMemo(() => {
    if (!rules) return { high: [], medium: [], low: [] };

    const grouped: Record<FraudRiskLevel, FraudRuleProps[]> = {
      high: [],
      medium: [],
      low: [],
    };

    rules.forEach((rule) => {
      grouped[rule.riskLevel].push(rule);
    });

    return grouped;
  }, [rules]);

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white">
        <div className="flex h-16 items-center justify-between px-6 py-4">
          <Sheet.Title className="text-lg font-semibold">
            Fraud and risks settings
          </Sheet.Title>
          <Sheet.Close asChild>
            <Button
              variant="outline"
              icon={<X className="size-5" />}
              className="h-auto w-fit p-1"
            />
          </Sheet.Close>
        </div>
      </div>

      <div className="h-full overflow-y-auto p-4 sm:p-6">
        {isLoading ? (
          <FraudRulesSkeleton />
        ) : (
          <div className="space-y-6">
            {(
              [
                {
                  level: "high",
                  label: "High risk",
                  dotColor: "bg-red-600",
                },
                {
                  level: "medium",
                  label: "Medium risk",
                  dotColor: "bg-amber-600",
                },
                {
                  level: "low",
                  label: "Low risk",
                  dotColor: "bg-neutral-500",
                },
              ] as const
            ).map(({ level, label, dotColor }) => {
              const rules = rulesByRiskLevel[level];

              if (rules.length === 0) return null;

              return (
                <div key={level}>
                  <div className="mb-6 flex items-center gap-2">
                    <div className={cn("size-3 rounded-full", dotColor)} />
                    <h3 className="text-content-emphasis text-base font-semibold leading-6">
                      {label}
                    </h3>
                  </div>
                  <div className="space-y-6">
                    {rules.map((rule) => (
                      <FraudRuleCard
                        key={rule.type}
                        rule={rule}
                        checked={localRules[rule.type] ?? rule.enabled}
                        onToggle={(checked) => handleToggle(rule.type, checked)}
                        disabled={isSubmitting}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="sticky bottom-0 z-10 border-t border-neutral-200 bg-white">
        <div className="flex items-center justify-end gap-2 p-5">
          <Button
            variant="secondary"
            text="Cancel"
            disabled={isSubmitting}
            className="h-8 w-fit px-3"
            onClick={() => setIsOpen(false)}
          />

          <Button
            text="Save"
            className="h-8 w-fit px-3"
            loading={isSubmitting}
            disabled={!isDirty || isLoading}
            onClick={handleSubmit}
          />
        </div>
      </div>
    </div>
  );
}

interface FraudRuleCardProps {
  rule: FraudRuleProps;
  checked: boolean;
  onToggle: (checked: boolean) => void;
  disabled?: boolean;
}

function FraudRuleCard({
  rule,
  checked,
  onToggle,
  disabled,
}: FraudRuleCardProps) {
  return (
    <div className="flex items-start gap-3">
      <Switch
        checked={checked}
        fn={onToggle}
        disabled={disabled}
        trackDimensions="radix-state-checked:bg-black focus-visible:ring-black/20"
      />
      <div className="flex-1 space-y-1">
        <h4 className="text-sm font-medium leading-none text-neutral-800">
          {rule.name}
        </h4>
        <p className="text-content-subtle text-xs font-normal tracking-normal">
          {rule.description}
        </p>
      </div>
    </div>
  );
}

function FraudRulesSkeleton() {
  return (
    <div className="space-y-6">
      {[...Array(3)].map((_, index) => (
        <div key={index}>
          <div className="mb-6 flex items-center gap-2">
            <div className="size-3 animate-pulse rounded-full bg-neutral-200" />
            <div className="h-6 w-24 animate-pulse rounded-md bg-neutral-200" />
          </div>
          <div className="space-y-6">
            {[...Array(2)].map((_, cardIndex) => (
              <FraudRuleCardSkeleton key={cardIndex} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function FraudRuleCardSkeleton() {
  return (
    <div className="flex items-start gap-3">
      <div className="h-5 w-10 shrink-0 animate-pulse rounded-full bg-neutral-200" />
      <div className="flex-1 space-y-1">
        <div className="h-4 w-48 animate-pulse rounded-md bg-neutral-200" />
        <div className="h-3 w-full animate-pulse rounded-md bg-neutral-200" />
      </div>
    </div>
  );
}

function ProgramFraudSettingsSheet({
  isOpen,
  ...rest
}: ProgramFraudSettingsSheetProps & {
  isOpen: boolean;
}) {
  return (
    <Sheet open={isOpen} onOpenChange={rest.setIsOpen}>
      <ProgramFraudSettingsSheetContent {...rest} />
    </Sheet>
  );
}

export function useProgramFraudSettingsSheet() {
  const [isOpen, setIsOpen] = useState(false);

  return {
    programFraudSettingsSheet: (
      <ProgramFraudSettingsSheet setIsOpen={setIsOpen} isOpen={isOpen} />
    ),
    setIsOpen,
  };
}
