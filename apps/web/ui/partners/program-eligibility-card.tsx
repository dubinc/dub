"use client";

import { evaluateCondition } from "@/lib/partners/evaluate-application-requirements";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { EligibilityConditionDB } from "@/lib/types";
import { CountryFlag } from "@/ui/shared/country-flag";
import { Lock } from "@dub/ui/icons";
import { COUNTRIES } from "@dub/utils";
import { ReactNode } from "react";

function formatConditionContent(
  condition: EligibilityConditionDB,
): ReactNode | null {
  if (condition.key === "country") {
    const intro =
      condition.operator === "is"
        ? "You can only apply to this program if you are from the following countries:"
        : "You cannot apply to this program if you are from the following countries:";

    return (
      <div className="space-y-2 text-sm text-blue-800">
        <p>{intro}</p>
        <div className="flex flex-wrap gap-1.5">
          {condition.value.map((code) => (
            <span
              key={code}
              className="inline-flex h-7 items-center gap-1.5 rounded-full bg-blue-100 px-2.5 text-xs font-medium text-blue-900"
            >
              <CountryFlag
                countryCode={code}
                className="size-3.5 rounded-full"
              />
              {COUNTRIES[code] ?? code}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // emailDomain — commented out, preserved for future use
  // if (condition.key === "emailDomain") {
  //   ...

  return null;
}

export function ProgramEligibilityCard({
  programSlug,
  requirements: requirementsProp,
}: {
  programSlug?: string;
  requirements?: EligibilityConditionDB[] | null;
} = {}) {
  const { programEnrollment } = useProgramEnrollment({ programSlug });
  const { partner, loading } = usePartnerProfile();

  const requirements =
    requirementsProp !== undefined
      ? requirementsProp
      : programEnrollment?.program?.applicationRequirements;

  if (!requirements?.length || loading) return null;

  const context = {
    country: partner?.country,
    email: partner?.email,
  };

  const unmet = requirements.filter(
    (condition) =>
      !evaluateCondition({
        condition,
        context,
      }),
  );

  const unmetConditions = unmet
    .map((condition) => ({
      condition,
      content: formatConditionContent(condition),
    }))
    .filter(({ content }) => content !== null);

  if (unmetConditions.length === 0) return null;

  return (
    <div className="mt-4 space-y-3 rounded-[10px] border border-blue-200 bg-blue-50 p-4">
      <div className="flex items-center gap-2 font-semibold text-blue-900">
        <Lock className="size-4 text-blue-500" />
        Program eligibility
      </div>

      {unmetConditions.map(({ condition, content }) => (
        <div key={`${condition.key}-${condition.operator}`}>{content}</div>
      ))}
    </div>
  );
}
