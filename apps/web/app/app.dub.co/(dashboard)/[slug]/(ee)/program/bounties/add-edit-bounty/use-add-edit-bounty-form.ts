"use client";

import { isCurrencyAttribute } from "@/lib/api/workflows/utils";
import { generatePerformanceBountyName } from "@/lib/bounty/api/generate-performance-bounty-name";
import { resolveBountyTiming } from "@/lib/bounty/bounty-period";
import {
  BOUNTY_DESCRIPTION_MAX_LENGTH,
  BOUNTY_MAX_SUBMISSIONS,
} from "@/lib/bounty/constants";
import { addFrequency } from "@/lib/bounty/periods";
import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useWorkspace from "@/lib/swr/use-workspace";
import { BountyProps } from "@/lib/types";
import {
  bountyPerformanceConditionSchema,
  bountySocialContentRequirementsSchema,
} from "@/lib/zod/schemas/bounties";
import { formatDate } from "@dub/utils";
import { BountySubmissionFrequency } from "@prisma/client";
import { addDays } from "date-fns";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { BountyTypeUI, CreateBountyInputExtended } from "./bounty-form-context";
import { useConfirmCreateBountyModal } from "./confirm-create-bounty-modal";

const ACCORDION_ITEMS = [
  "bounty-type",
  "bounty-details",
  "bounty-criteria",
  "groups",
];

const DEFAULT_SOCIAL_METRICS_CRITERIA = {
  platform: "youtube",
  metric: "views",
} as const;

const resolveSocialMetricsCriteria = (
  existing?: NonNullable<
    CreateBountyInputExtended["submissionRequirements"]
  >["socialMetrics"],
) => ({
  ...DEFAULT_SOCIAL_METRICS_CRITERIA,
  ...existing,
});

const isEmpty = (value: unknown) =>
  value === undefined || value === null || value === "";

function getEffectiveEndsAt({
  startsAt,
  endsAt,
  endsAfterDays,
}: {
  startsAt: Date;
  endsAt: Date | null;
  endsAfterDays: number | null;
}) {
  if (endsAt) {
    return endsAt;
  }

  if (endsAfterDays != null) {
    return addDays(startsAt, endsAfterDays);
  }

  return null;
}

function getSubmissionWindowFromBounty(bounty?: BountyProps): number | null {
  if (!bounty?.submissionsOpenAt || !bounty?.endsAt) return null;

  const days = Math.ceil(
    (new Date(bounty.endsAt).getTime() -
      new Date(bounty.submissionsOpenAt).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  return days >= 2 && days <= 14 ? days : null;
}

export function useAddEditBountyForm({
  bounty,
  setIsOpen,
}: {
  bounty?: BountyProps;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const { id: workspaceId } = useWorkspace();
  const { makeRequest, isSubmitting } = useApiMutation<BountyProps>();

  const defaultTiming = resolveBountyTiming({
    startPreset: "today",
    endPreset: "never",
  });

  const [hasEndDate, setHasEndDate] = useState(
    !!bounty?.endsAt || !!bounty?.endsAfterDays,
  );
  const [openAccordions, setOpenAccordions] = useState(ACCORDION_ITEMS);
  const [allowedSubmissions, setAllowedSubmissions] = useState<number>(
    bounty?.maxSubmissions ?? 1,
  );
  const [submissionFrequency, setSubmissionFrequency] =
    useState<BountySubmissionFrequency | null>(
      bounty?.submissionFrequency ?? null,
    );

  const [submissionWindow, setSubmissionWindow] = useState<number | null>(() =>
    getSubmissionWindowFromBounty(bounty),
  );

  const initialSubmissionRequirements = (() => {
    const raw = bounty?.submissionRequirements;
    const bonus = raw?.socialMetrics?.incrementalBonus;

    if (raw && bonus && typeof bonus.bonusPerIncrement === "number") {
      return {
        ...raw,
        socialMetrics: {
          ...raw.socialMetrics!,
          incrementalBonus: {
            ...bonus,
            bonusPerIncrement: bonus.bonusPerIncrement / 100,
          },
        },
      };
    }
    return raw ?? null;
  })();

  const form = useForm<CreateBountyInputExtended>({
    defaultValues: {
      name: bounty?.name || undefined,
      description: bounty?.description || undefined,
      startsAt: bounty?.startsAt || defaultTiming.startsAt,
      endsAt: bounty?.endsAt ?? defaultTiming.endsAt,
      startMode: bounty?.startMode ?? defaultTiming.startMode,
      endsAfterDays: bounty?.endsAfterDays ?? defaultTiming.endsAfterDays,
      submissionsOpenAt: bounty?.submissionsOpenAt || undefined,
      rewardAmount: bounty?.rewardAmount
        ? bounty.rewardAmount / 100
        : undefined,
      rewardDescription: bounty?.rewardDescription || undefined,
      type: bounty?.type || "performance",
      bountyTypeUI:
        bounty?.type === "performance"
          ? "performance"
          : bounty?.submissionRequirements &&
              typeof bounty.submissionRequirements === "object" &&
              "socialMetrics" in bounty.submissionRequirements
            ? "socialMetrics"
            : bounty
              ? "submission"
              : "performance",
      submissionRequirements: initialSubmissionRequirements,
      groupIds: bounty?.groups?.map(({ id }) => id) || null,
      performanceCondition: bounty?.performanceCondition
        ? {
            ...bounty.performanceCondition,
            value: isCurrencyAttribute(bounty.performanceCondition.attribute)
              ? bounty.performanceCondition.value / 100
              : bounty.performanceCondition.value,
          }
        : {
            operator: "gte",
          },
      performanceScope: bounty?.performanceScope ?? "new",
      rewardType: bounty ? (bounty.rewardAmount ? "flat" : "custom") : "flat",
    },
    shouldUnregister: false,
  });

  const {
    handleSubmit,
    watch,
    setValue,
    control,
    register,
    formState: { errors, isDirty },
  } = form;

  const [
    startsAt,
    endsAt,
    startMode,
    endsAfterDays,
    rewardAmount,
    rewardDescription,
    type,
    bountyTypeUI,
    name,
    description,
    performanceCondition,
    groupIds,
    rewardType,
    submissionRequirements,
  ] = watch([
    "startsAt",
    "endsAt",
    "startMode",
    "endsAfterDays",
    "rewardAmount",
    "rewardDescription",
    "type",
    "bountyTypeUI",
    "name",
    "description",
    "performanceCondition",
    "groupIds",
    "rewardType",
    "submissionRequirements",
  ]);

  const handleTimingChange = useCallback(
    ({
      startMode: nextStartMode,
      startsAt: nextStartsAt,
      endsAt: nextEndsAt,
      endsAfterDays: nextEndsAfterDays,
    }: ReturnType<typeof resolveBountyTiming>) => {
      setValue("startMode", nextStartMode, {
        shouldDirty: true,
        shouldValidate: true,
      });

      setValue("startsAt", nextStartsAt, {
        shouldDirty: true,
        shouldValidate: true,
      });

      setValue("endsAt", nextEndsAt, {
        shouldDirty: true,
        shouldValidate: true,
      });

      setValue("endsAfterDays", nextEndsAfterDays, {
        shouldDirty: true,
        shouldValidate: true,
      });

      setHasEndDate(
        Boolean(nextEndsAt) ||
          (nextStartMode === "relative" && Boolean(nextEndsAfterDays)),
      );

      if (!nextEndsAt) {
        setSubmissionWindow(null);
        setValue("submissionsOpenAt", null, { shouldDirty: true });
      } else if (submissionWindow != null) {
        const submissionsOpenAt = new Date(nextEndsAt);
        submissionsOpenAt.setDate(
          submissionsOpenAt.getDate() - submissionWindow,
        );

        setValue("submissionsOpenAt", submissionsOpenAt, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    },
    [setValue, submissionWindow],
  );

  const handleSubmissionWindowToggle = (checked: boolean) => {
    if (checked) {
      const val = getSubmissionWindowFromBounty(bounty) ?? 2;
      setSubmissionWindow(val);
      if (endsAt) {
        const submissionsOpenAt = new Date(endsAt);
        submissionsOpenAt.setDate(submissionsOpenAt.getDate() - val);
        setValue("submissionsOpenAt", submissionsOpenAt, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    } else {
      setSubmissionWindow(null);
      setValue("submissionsOpenAt", null, { shouldDirty: true });
    }
  };

  const handleSubmissionFrequencyToggle = (checked: boolean) => {
    if (checked) {
      if (allowedSubmissions < 2) {
        setAllowedSubmissions(2);
        setValue("maxSubmissions", 2, { shouldDirty: true });
      }

      if (submissionWindow != null) {
        setSubmissionWindow(null);
        setValue("submissionsOpenAt", null, { shouldDirty: true });
      }

      setSubmissionFrequency(BountySubmissionFrequency.day);
      setValue("submissionFrequency", BountySubmissionFrequency.day, {
        shouldDirty: true,
      });
    } else {
      setSubmissionFrequency(null);
      setValue("submissionFrequency", null, { shouldDirty: true });
    }
  };

  const handleSubmissionFrequencyChange = (
    value: BountySubmissionFrequency,
  ) => {
    setSubmissionFrequency(value);
    setValue("submissionFrequency", value, { shouldDirty: true });
  };

  const handleAllowedSubmissionsChange = (value: number) => {
    setAllowedSubmissions(value);
    setValue("maxSubmissions", value > 1 ? value : null, { shouldDirty: true });
    if (value > 1 && submissionWindow != null) {
      setSubmissionWindow(null);
      setValue("submissionsOpenAt", null, { shouldDirty: true });
    }
    if (value === 1 && submissionFrequency != null) {
      setSubmissionFrequency(null);
      setValue("submissionFrequency", null, { shouldDirty: true });
    }
  };

  const effectiveEndsAt = useMemo(
    () =>
      getEffectiveEndsAt({
        startsAt: startsAt ? new Date(startsAt) : new Date(),
        endsAt: endsAt ? new Date(endsAt) : null,
        endsAfterDays: endsAfterDays ?? null,
      }),
    [startsAt, endsAt, endsAfterDays],
  );

  const maxAllowedSubmissions = useMemo(() => {
    if (!submissionFrequency || !effectiveEndsAt) return BOUNTY_MAX_SUBMISSIONS;

    const start = startsAt ? new Date(startsAt) : new Date();
    const end = effectiveEndsAt;

    let count = 0;
    for (let i = 0; i < BOUNTY_MAX_SUBMISSIONS; i++) {
      const periodStart = addFrequency({
        date: start,
        frequency: submissionFrequency,
        amount: i,
      });
      if (periodStart >= end) break;
      count++;
    }

    return count;
  }, [submissionFrequency, startsAt, effectiveEndsAt]);

  useEffect(() => {
    if (allowedSubmissions > maxAllowedSubmissions) {
      const clamped = maxAllowedSubmissions;
      setAllowedSubmissions(clamped);
      setValue("maxSubmissions", clamped > 1 ? clamped : null, {
        shouldDirty: true,
      });
      if (clamped === 1 && submissionFrequency != null) {
        setSubmissionFrequency(null);
        setValue("submissionFrequency", null, { shouldDirty: true });
      }
    }
  }, [
    maxAllowedSubmissions,
    allowedSubmissions,
    setValue,
    submissionFrequency,
  ]);

  const handleSubmissionWindowChange = (value: number) => {
    setSubmissionWindow(value);
    if (endsAt) {
      const submissionsOpenAt = new Date(endsAt);
      submissionsOpenAt.setDate(submissionsOpenAt.getDate() - value);
      setValue("submissionsOpenAt", submissionsOpenAt, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  };

  const handleBountyTypeUIChange = (bountyTypeUI: BountyTypeUI) => {
    setValue("bountyTypeUI", bountyTypeUI, { shouldDirty: true });

    if (bountyTypeUI === "performance") {
      setValue("type", "performance", { shouldDirty: true });
      setValue("submissionRequirements", null, { shouldDirty: true });
      return;
    }

    setValue("type", "submission", { shouldDirty: true });

    const currentSubmissionRequirements = form.getValues(
      "submissionRequirements",
    );

    if (bountyTypeUI === "socialMetrics") {
      setValue(
        "submissionRequirements",
        {
          socialMetrics: resolveSocialMetricsCriteria(
            currentSubmissionRequirements &&
              typeof currentSubmissionRequirements === "object" &&
              currentSubmissionRequirements.socialMetrics
              ? currentSubmissionRequirements.socialMetrics
              : undefined,
          ),
        },
        { shouldDirty: true },
      );
      return;
    }

    if (
      currentSubmissionRequirements &&
      typeof currentSubmissionRequirements === "object" &&
      "socialMetrics" in currentSubmissionRequirements
    ) {
      const { socialMetrics: _socialMetrics, ...rest } =
        currentSubmissionRequirements;

      setValue(
        "submissionRequirements",
        Object.keys(rest).length > 0 ? rest : null,
        { shouldDirty: true },
      );
    }
  };

  const validationError = useMemo(() => {
    const now = new Date();

    const effectiveStartDate = startsAt ? new Date(startsAt) : now;

    const effectiveEndDate = endsAfterDays
      ? addDays(effectiveStartDate, endsAfterDays)
      : endsAt
        ? new Date(endsAt)
        : null;

    if (effectiveEndDate) {
      if (effectiveEndDate <= effectiveStartDate) {
        return `Please choose an end date that is after the start date (${formatDate(effectiveStartDate)}).`;
      }

      const minEndDate = new Date(
        effectiveStartDate.getTime() + 60 * 60 * 1000,
      );
      if (effectiveEndDate < minEndDate) {
        return "End date must be at least 1 hour after the start date.";
      }
    }

    if (type === "submission" && submissionWindow != null) {
      if (!endsAt) {
        return "An end date is required to determine when the submission window opens.";
      }
      if (submissionWindow < 2 || submissionWindow > 14) {
        return "Submission window must be between 2 and 14 days.";
      }
      const calculatedSubmissionsOpenAt = new Date(endsAt);
      calculatedSubmissionsOpenAt.setDate(
        calculatedSubmissionsOpenAt.getDate() - submissionWindow,
      );
      if (calculatedSubmissionsOpenAt < effectiveStartDate) {
        return "Submission window is too long. It would open before the bounty starts.";
      }
    }

    if (type === "submission") {
      if (!name?.trim()) {
        return "Name is required for submission bounties.";
      }

      if (name && name.length > 100) {
        return "Name must be 100 characters or less.";
      }

      if ((rewardType ?? "flat") === "flat") {
        if (isEmpty(rewardAmount)) {
          return "Reward amount is required for flat rate rewards.";
        }
        if (rewardAmount !== null && rewardAmount <= 0) {
          return "Reward amount must be greater than 0.";
        }
        if (rewardAmount !== null && rewardAmount > 1000000) {
          return "Reward amount cannot exceed $1,000,000.";
        }
      }

      if ((rewardType ?? "flat") === "custom") {
        if (bountyTypeUI !== "socialMetrics") {
          if (!rewardDescription?.trim()) {
            return "Reward description is required for custom rewards.";
          }
          if (rewardDescription && rewardDescription.length > 100) {
            return "Reward description must be 100 characters or less.";
          }
        }
      }

      if (bountyTypeUI === "socialMetrics") {
        const socialMetrics = submissionRequirements?.socialMetrics;

        if (!socialMetrics) {
          return "Social metrics criteria are required.";
        }

        const parsed =
          bountySocialContentRequirementsSchema.safeParse(socialMetrics);

        if (!parsed.success) {
          return (
            parsed.error.issues[0]?.message ??
            "Invalid social metrics criteria."
          );
        }

        if (!socialMetrics.minCount || socialMetrics.minCount <= 0) {
          return "Minimum metric count must be greater than 0.";
        }
      }
    }

    if (type === "performance") {
      const condition = performanceCondition;

      if (!condition?.attribute) {
        return "Performance attribute is required.";
      }

      if (!condition?.operator) {
        return "Performance operator is required.";
      }

      if (isEmpty(condition?.value)) {
        return "Performance value is required.";
      }

      if (condition?.value !== null && condition.value < 0) {
        return "Performance value must be greater than or equal to 0.";
      }

      if (isEmpty(rewardAmount)) {
        return "Reward amount is required for performance bounties.";
      }

      if (rewardAmount !== null && rewardAmount <= 0) {
        return "Reward amount must be greater than 0.";
      }

      if (rewardAmount !== null && rewardAmount > 1000000) {
        return "Reward amount cannot exceed $1,000,000.";
      }
    }

    if (description && description.length > BOUNTY_DESCRIPTION_MAX_LENGTH) {
      return `Description must be ${BOUNTY_DESCRIPTION_MAX_LENGTH} characters or less.`;
    }

    return null;
  }, [
    bounty,
    startsAt,
    endsAt,
    endsAfterDays,
    submissionWindow,
    rewardAmount,
    rewardDescription,
    rewardType,
    type,
    bountyTypeUI,
    name,
    description,
    performanceCondition?.attribute,
    performanceCondition?.operator,
    performanceCondition?.value,
    submissionRequirements,
  ]);

  const performSubmit = async ({
    sendNotificationEmails,
  }: { sendNotificationEmails?: boolean } = {}) => {
    if (!workspaceId) return;

    const {
      rewardType: formRewardType,
      bountyTypeUI: _bountyTypeUI,
      ...data
    } = form.getValues();

    // Relative bounties start when a partner joins, so startsAt must be null
    if (data.startMode === "relative") {
      data.startsAt = null;
    }

    const rawRewardAmount = data.rewardAmount;
    const numAmount =
      typeof rawRewardAmount === "number" && !Number.isNaN(rawRewardAmount)
        ? rawRewardAmount
        : null;
    data.rewardAmount =
      numAmount != null && numAmount > 0 ? numAmount * 100 : null;

    if (data.type === "performance") {
      const result = bountyPerformanceConditionSchema.safeParse(
        data.performanceCondition,
      );

      if (!result.success) {
        toast.error(
          "Invalid performance logic. Please fix the errors and try again.",
        );
        return;
      }

      let { data: condition } = result;

      condition = {
        ...condition,
        value: isCurrencyAttribute(condition.attribute)
          ? condition.value * 100
          : condition.value,
      };

      data.performanceCondition = condition;
      data.rewardDescription = null;
      data.submissionsOpenAt = null;
    } else if (data.type === "submission") {
      data.performanceCondition = null;

      if ((formRewardType ?? "flat") === "custom") {
        data.rewardAmount = null;
      } else if ((formRewardType ?? "flat") === "flat") {
        data.rewardDescription = null;
      }

      const incBonus =
        data.submissionRequirements?.socialMetrics?.incrementalBonus;
      if (incBonus && typeof incBonus.bonusPerIncrement === "number") {
        data.submissionRequirements = {
          ...data.submissionRequirements!,
          socialMetrics: {
            ...data.submissionRequirements!.socialMetrics!,
            incrementalBonus: {
              ...incBonus,
              bonusPerIncrement: incBonus.bonusPerIncrement * 100,
            },
          },
        };
      }
    }

    await makeRequest(bounty ? `/api/bounties/${bounty.id}` : "/api/bounties", {
      method: bounty ? "PATCH" : "POST",
      body: { ...data, sendNotificationEmails },
      onSuccess: () => {
        mutatePrefix("/api/bounties");
        setIsOpen(false);
        toast.success(`Bounty ${bounty ? "updated" : "created"} successfully!`);
      },
    });
  };

  const { setShowConfirmCreateBountyModal, confirmCreateBountyModal } =
    useConfirmCreateBountyModal({
      bounty: !validationError
        ? {
            type,
            name:
              type === "performance" && performanceCondition
                ? generatePerformanceBountyName({
                    rewardAmount: rewardAmount ? rewardAmount * 100 : 0,
                    condition: isCurrencyAttribute(
                      performanceCondition?.attribute,
                    )
                      ? {
                          ...performanceCondition,
                          value: performanceCondition?.value * 100,
                        }
                      : performanceCondition,
                  })
                : name || "New bounty",
            startsAt: startMode === "relative" ? null : startsAt || new Date(),
            endsAt: startMode === "relative" ? null : effectiveEndsAt,
            startMode: startMode ?? "absolute",
            endsAfterDays: endsAfterDays ?? null,
            rewardAmount: rewardAmount ? rewardAmount * 100 : null,
            rewardDescription: rewardDescription || null,
            submissionRequirements: submissionRequirements ?? null,
            groups: groupIds?.map((id) => ({ id })) || [],
          }
        : undefined,
      onConfirm: async ({ sendNotificationEmails }) => {
        await performSubmit({ sendNotificationEmails });
      },
    });

  const onSubmit = handleSubmit(async () => {
    if (bounty) {
      await performSubmit();
    } else {
      setShowConfirmCreateBountyModal(true);
    }
  });

  return {
    form,
    hasEndDate,
    openAccordions,
    setOpenAccordions,
    type,
    bountyTypeUI,
    name,
    control,
    register,
    setValue,
    watch,
    errors,
    isDirty,
    startsAt,
    endsAt,
    startMode,
    endsAfterDays,
    handleTimingChange,
    allowedSubmissions,
    handleAllowedSubmissionsChange,
    maxAllowedSubmissions,
    submissionFrequency,
    handleSubmissionFrequencyToggle,
    handleSubmissionFrequencyChange,
    submissionWindow,
    handleSubmissionWindowToggle,
    handleSubmissionWindowChange,
    handleBountyTypeUIChange,
    validationError,
    confirmCreateBountyModal,
    setShowConfirmCreateBountyModal,
    onSubmit,
    isSubmitting,
  };
}
