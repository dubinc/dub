"use client";

import { partnerMeetsCondition } from "@/lib/partners/check-eligibility-requirements";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { EligibilityConditionDB } from "@/lib/zod/schemas/programs";
import { Lock } from "@dub/ui/icons";
import { COUNTRIES } from "@dub/utils";

function oxfordJoin(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} or ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, or ${items[items.length - 1]}`;
}

function formatConditionText(condition: EligibilityConditionDB): string {
  if (condition.key === "country") {
    const countryNames = condition.value.map((code) => COUNTRIES[code] ?? code);
    const joined = oxfordJoin(countryNames);

    if (condition.operator === "is") {
      return `Your country is ${joined}`;
    } else {
      return `Your country is not ${joined}`;
    }
  }

  // emailDomain — commented out, preserved for future use
  // if (condition.key === "emailDomain") {
  //   const joined = oxfordJoin(condition.value);
  //   if (condition.operator === "is") {
  //     return `Your email domain is ${joined}`;
  //   } else {
  //     return `Your email domain is not ${joined}`;
  //   }
  // }

  return "";
}

export function ProgramEligibilityCard({
  requirements: requirementsProp,
}: {
  requirements?: EligibilityConditionDB[] | null;
} = {}) {
  const { programEnrollment } = useProgramEnrollment();
  const { partner } = usePartnerProfile();

  const requirements =
    requirementsProp !== undefined
      ? requirementsProp
      : programEnrollment?.program?.applicationRequirements;
  if (!requirements?.length) return null;

  const unmet = requirements.filter((c) => !partnerMeetsCondition(c, partner));

  if (unmet.length === 0) return null;

  return (
    <div className="space-y-3 rounded-[10px] border border-blue-200 bg-blue-50 p-4">
      <div className="flex items-center gap-2 font-semibold text-blue-900">
        <Lock className="size-4 text-blue-500" />
        Program eligibility
      </div>

      <ul className="list-disc space-y-1 pl-5 text-sm text-blue-800">
        {unmet.map((c) => (
          <li key={c.key}>{formatConditionText(c)}</li>
        ))}
      </ul>
    </div>
  );
}
