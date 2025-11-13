"use client";

import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { X } from "@/ui/shared/icons";
import { FraudRiskLevel } from "@dub/prisma/client";
import { Button, Sheet, Switch } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";

type ProgramFraudSettingsSheetProps = {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
};

interface FraudRuleResponse {
  id?: string;
  type: string;
  name: string;
  riskLevel: FraudRiskLevel;
  description: string;
  enabled: boolean;
  config: unknown;
}

function ProgramFraudSettingsSheetContent({
  setIsOpen,
}: ProgramFraudSettingsSheetProps) {
  const { defaultProgramId, id: workspaceId } = useWorkspace();
  const [localRules, setLocalRules] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: rules, isLoading } = useSWR<FraudRuleResponse[]>(
    defaultProgramId ? `/api/fraud-rules?workspaceId=${workspaceId}` : null,
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

  const handleToggle = (ruleType: string, enabled: boolean) => {
    setLocalRules((prev) => ({
      ...prev,
      [ruleType]: enabled,
    }));
  };

  const handleSubmit = async () => {
    if (!defaultProgramId) {
      return;
    }

    setIsSubmitting(true);
    try {
      const updates = Object.entries(localRules).map(([type, enabled]) => ({
        type,
        enabled,
      }));

      const response = await fetch(
        `/api/fraud-rules?workspaceId=${workspaceId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ rules: updates }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update fraud rules");
      }

      toast.success("Fraud settings updated successfully.");
      setIsOpen(false);
      mutatePrefix(`/api/fraud-rules`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update fraud settings.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDirty = useMemo(() => {
    if (!rules) return false;
    return rules.some((rule) => localRules[rule.type] !== rule.enabled);
  }, [rules, localRules]);

  // Group rules by risk level
  const rulesByRiskLevel = useMemo(() => {
    if (!rules) return { high: [], medium: [], low: [] };

    const grouped: Record<FraudRiskLevel, FraudRuleResponse[]> = {
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

      <div className="h-full overflow-y-auto bg-neutral-50 p-4 sm:p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-neutral-500">Loading rules...</p>
          </div>
        ) : (
          <>
            {/* High risk rules */}
            {rulesByRiskLevel.high.length > 0 && (
              <div className="mb-8">
                <div className="mb-4 flex items-center gap-2">
                  <div className="size-2 rounded-full bg-red-500" />
                  <h3 className="text-base font-semibold text-neutral-900">
                    High risk
                  </h3>
                </div>
                <div className="space-y-4">
                  {rulesByRiskLevel.high.map((rule) => (
                    <div
                      key={rule.type}
                      className="rounded-lg border border-neutral-200 bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-neutral-900">
                              {rule.name}
                            </h4>
                          </div>
                          <p className="text-sm text-neutral-500">
                            {rule.description}
                          </p>
                        </div>
                        <Switch
                          checked={localRules[rule.type] ?? rule.enabled}
                          fn={(checked) => handleToggle(rule.type, checked)}
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Medium risk rules */}
            {rulesByRiskLevel.medium.length > 0 && (
              <div className="mb-8">
                <div className="mb-4 flex items-center gap-2">
                  <div className="size-2 rounded-full bg-orange-500" />
                  <h3 className="text-base font-semibold text-neutral-900">
                    Medium risk
                  </h3>
                </div>
                <div className="space-y-4">
                  {rulesByRiskLevel.medium.map((rule) => (
                    <div
                      key={rule.type}
                      className="rounded-lg border border-neutral-200 bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-neutral-900">
                              {rule.name}
                            </h4>
                          </div>
                          <p className="text-sm text-neutral-500">
                            {rule.description}
                          </p>
                        </div>
                        <Switch
                          checked={localRules[rule.type] ?? rule.enabled}
                          fn={(checked) => handleToggle(rule.type, checked)}
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Low risk rules */}
            {rulesByRiskLevel.low.length > 0 && (
              <div className="mb-8">
                <div className="mb-4 flex items-center gap-2">
                  <div className="size-2 rounded-full bg-neutral-400" />
                  <h3 className="text-base font-semibold text-neutral-900">
                    Low risk
                  </h3>
                </div>
                <div className="space-y-4">
                  {rulesByRiskLevel.low.map((rule) => (
                    <div
                      key={rule.type}
                      className="rounded-lg border border-neutral-200 bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-neutral-900">
                              {rule.name}
                            </h4>
                          </div>
                          <p className="text-sm text-neutral-500">
                            {rule.description}
                          </p>
                        </div>
                        <Switch
                          checked={localRules[rule.type] ?? rule.enabled}
                          fn={(checked) => handleToggle(rule.type, checked)}
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
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

export function ProgramFraudSettingsSheet({
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
