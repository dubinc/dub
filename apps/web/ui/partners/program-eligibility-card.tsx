"use client";

import { evaluateCondition } from "@/lib/partners/evaluate-application-requirements";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { EligibilityConditionDB } from "@/lib/types";
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

  const unmetWithText = unmet.map(formatConditionText).filter(Boolean);

  if (unmetWithText.length === 0) return null;

  return (
    <div className="mt-4 space-y-3 rounded-[10px] border border-blue-200 bg-blue-50 p-4">
      <div className="flex items-center gap-2 font-semibold text-blue-900">
        <Lock className="size-4 text-blue-500" />
        Program eligibility
      </div>

      <ul className="list-disc space-y-1 pl-5 text-sm text-blue-800">
        {unmetWithText.map((text, i) => (
          <li key={i}>{text}</li>
        ))}
      </ul>
    </div>
  );
}
