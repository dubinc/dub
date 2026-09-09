"use client";

import {
  EligibilityContext,
  getEligibilityContext,
  isAccountAttributeMet,
  isCountryConditionMet,
  isProfileAttributeMet,
} from "@/lib/partners/evaluate-application-requirements";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import useProgramEnrollments from "@/lib/swr/use-program-enrollments";
import { EligibilityConditionDB } from "@/lib/types";
import {
  EligibilityAccountAttribute,
  EligibilityProfileAttribute,
} from "@/lib/zod/schemas/programs";
import { CountryFlag } from "@/ui/shared/country-flag";
import { Icon } from "@dub/ui";
import { Lock } from "@dub/ui/icons";
import { cn, COUNTRIES } from "@dub/utils";
import { ReactNode } from "react";
import {
  ELIGIBILITY_ACCOUNT_ATTRIBUTE_META,
  ELIGIBILITY_PROFILE_ATTRIBUTE_META,
} from "./eligibility-attributes";

function EligibilityPill({
  icon: Icon,
  iconClassName,
  children,
}: {
  icon?: Icon;
  iconClassName?: string;
  children: ReactNode;
}) {
  return (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-blue-100 px-2.5 text-xs font-medium text-blue-900">
      {Icon && (
        <span className="flex w-4 shrink-0 items-center justify-center">
          <Icon className={cn("text-blue-600", iconClassName ?? "size-3.5")} />
        </span>
      )}
      {children}
    </span>
  );
}

// Only renders what the partner is missing: met conditions (and met
// account/profile attributes) are hidden
function conditionSection(
  condition: EligibilityConditionDB,
  context: EligibilityContext,
): {
  label: string;
  pills: ReactNode;
} | null {
  switch (condition.key) {
    case "country": {
      if (isCountryConditionMet(context.country, condition)) return null;

      return {
        label: condition.operator === "is_not" ? "Not based in" : "Based in",
        pills: condition.value.map((code) => (
          <EligibilityPill key={code}>
            <CountryFlag countryCode={code} className="size-3.5 rounded-full" />
            {COUNTRIES[code] ?? code}
          </EligibilityPill>
        )),
      };
    }

    case "account": {
      const unmet = condition.value.filter(
        (attribute) =>
          !isAccountAttributeMet(
            context.account,
            attribute as EligibilityAccountAttribute,
          ),
      );

      if (unmet.length === 0) return null;

      return {
        label: "Account must be",
        pills: unmet.map((attribute) => {
          const meta =
            ELIGIBILITY_ACCOUNT_ATTRIBUTE_META[
              attribute as EligibilityAccountAttribute
            ];
          if (!meta) return null;
          return (
            <EligibilityPill
              key={attribute}
              icon={meta.icon}
              iconClassName={meta.iconClassName}
            >
              {meta.cardLabel}
            </EligibilityPill>
          );
        }),
      };
    }

    case "profile": {
      const unmet = condition.value.filter(
        (attribute) =>
          !isProfileAttributeMet(
            context.profile,
            attribute as EligibilityProfileAttribute,
          ),
      );

      if (unmet.length === 0) return null;

      return {
        label: "Profile must include",
        pills: unmet.map((attribute) => {
          const meta =
            ELIGIBILITY_PROFILE_ATTRIBUTE_META[
              attribute as EligibilityProfileAttribute
            ];
          if (!meta) return null;
          return (
            <EligibilityPill
              key={attribute}
              icon={meta.icon}
              iconClassName={meta.iconClassName}
            >
              {meta.cardLabel}
            </EligibilityPill>
          );
        }),
      };
    }

    // legacy emailDomain conditions are enforced but not displayed
    default:
      return null;
  }
}

const SECTION_ORDER: EligibilityConditionDB["key"][] = [
  "country",
  "account",
  "profile",
];

export function ProgramEligibilityCard({
  programSlug,
  requirements: requirementsProp,
}: {
  programSlug?: string;
  requirements?: EligibilityConditionDB[] | null;
} = {}) {
  const { programEnrollment } = useProgramEnrollment({ programSlug });
  const { partner, loading, error: partnerError } = usePartnerProfile();
  const {
    programEnrollments,
    isLoading: programEnrollmentsLoading,
    error: programEnrollmentsError,
  } = useProgramEnrollments();

  const requirements =
    requirementsProp !== undefined
      ? requirementsProp
      : programEnrollment?.program?.applicationRequirements;

  // Eligibility is unknown until both requests settle successfully — while
  // loading or after a failed fetch, showing requirements would be a guess
  if (
    !requirements?.length ||
    loading ||
    programEnrollmentsLoading ||
    partnerError ||
    programEnrollmentsError
  )
    return null;

  const context = getEligibilityContext({
    partner,
    programEnrollmentStatuses: programEnrollments?.map(({ status }) => status),
  });

  const sections = SECTION_ORDER.flatMap((key) => {
    const condition = requirements.find(
      (requirement) => requirement.key === key,
    );
    const section = condition ? conditionSection(condition, context) : null;
    return section ? [section] : [];
  });

  if (sections.length === 0) return null;

  return (
    <div className="mt-4 rounded-[10px] border border-blue-200 bg-blue-50 p-4">
      <div className="flex items-start gap-2">
        <Lock className="mt-0.5 size-4 shrink-0 text-blue-500" />
        <div className="min-w-0 flex-1 space-y-4">
          <div className="space-y-1">
            <div className="text-sm font-semibold leading-5 text-blue-900">
              Program eligibility
            </div>
            <p className="text-sm text-blue-800">
              You can only apply to this program if you meet the following
              requirements:
            </p>
          </div>

          {sections.map(({ label, pills }) => (
            <div key={label} className="space-y-2">
              <div className="text-xs font-semibold text-blue-900">{label}</div>
              <div className="flex flex-wrap gap-1.5">{pills}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
