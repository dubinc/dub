"use client";

import { isCurrencyAttribute } from "@/lib/api/workflows/utils";
import { generatePerformanceBountyName } from "@/lib/bounty/api/generate-performance-bounty-name";
import { BOUNTY_DESCRIPTION_MAX_LENGTH } from "@/lib/bounty/constants";
import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useWorkspace from "@/lib/swr/use-workspace";
import { BountyProps } from "@/lib/types";
import { bountyPerformanceConditionSchema } from "@/lib/zod/schemas/bounties";
import { formatDate } from "@dub/utils";
import { Dispatch, SetStateAction, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { CreateBountyInputExtended, EndDateMode } from "./bounty-form-context";
import { useConfirmCreateBountyModal } from "./confirm-create-bounty-modal";

const ACCORDION_ITEMS = [
  "bounty-type",
  "bounty-details",
  "bounty-criteria",
  "groups",
];

const isEmpty = (value: unknown) =>
  value === undefined || value === null || value === "";

export function useAddEditBountyForm({
  bounty,
  setIsOpen,
}: {
  bounty?: BountyProps;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const { id: workspaceId } = useWorkspace();
  const { makeRequest, isSubmitting } = useApiMutation<BountyProps>();

  const [hasStartDate, setHasStartDate] = useState(!!bounty?.startsAt);
  const [hasEndDate, setHasEndDate] = useState(!!bounty?.endsAt);
  const [openAccordions, setOpenAccordions] = useState(ACCORDION_ITEMS);

  const [submissionWindow, setSubmissionWindow] = useState<number | null>(
    () => {
      if (!bounty?.submissionsOpenAt || !bounty?.endsAt) return null;
      const days = Math.ceil(
        (new Date(bounty.endsAt).getTime() -
          new Date(bounty.submissionsOpenAt).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      return days >= 2 && days <= 14 ? days : null;
    },
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
      startsAt: bounty?.startsAt || undefined,
      endsAt: bounty?.endsAt || undefined,
      submissionsOpenAt: bounty?.submissionsOpenAt || undefined,
      rewardAmount: bounty?.rewardAmount
        ? bounty.rewardAmount / 100
        : undefined,
      rewardDescription: bounty?.rewardDescription || undefined,
      type: bounty?.type || "performance",
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
      submissionCriteriaType:
        bounty?.submissionRequirements &&
        typeof bounty.submissionRequirements === "object" &&
        "socialMetrics" in bounty.submissionRequirements
          ? "socialMetrics"
          : "manualSubmission",
      endDateMode:
        bounty?.maxSubmissions != null || bounty?.submissionFrequency
          ? "repeat-submissions"
          : "fixed-end-date",
      submissionFrequency: bounty?.submissionFrequency ?? "week",
      maxSubmissions: bounty?.maxSubmissions ?? 2,
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

  const endDateMode = watch("endDateMode") ?? "fixed-end-date";
  const maxSubmissions = watch("maxSubmissions") ?? 2;
  const isRepeatMode = endDateMode === "repeat-submissions";

  const [
    startsAt,
    endsAt,
    rewardAmount,
    rewardDescription,
    type,
    name,
    description,
    performanceCondition,
    groupIds,
    rewardType,
    submissionRequirements,
    submissionFrequency,
    totalSubmissionsAllowedVal,
  ] = watch([
    "startsAt",
    "endsAt",
    "rewardAmount",
    "rewardDescription",
    "type",
    "name",
    "description",
    "performanceCondition",
    "groupIds",
    "rewardType",
    "submissionRequirements",
    "submissionFrequency",
    "maxSubmissions",
  ]);

  const handleStartDateToggle = (checked: boolean) => {
    setHasStartDate(checked);
    if (!checked) {
      setValue("startsAt", null, { shouldDirty: true, shouldValidate: true });
    }
  };

  const handleEndDateToggle = (checked: boolean) => {
    setHasEndDate(checked);
    if (!checked) {
      setValue("endsAt", null, { shouldDirty: true, shouldValidate: true });
      setSubmissionWindow(null);
      setValue("submissionsOpenAt", null, { shouldDirty: true });
    }
  };

  const handleEndDateChange = (date: Date | null) => {
    setValue("endsAt", date, {
      shouldDirty: true,
      shouldValidate: true,
    });
    if (date && submissionWindow != null) {
      const submissionsOpenAt = new Date(date);
      submissionsOpenAt.setDate(submissionsOpenAt.getDate() - submissionWindow);
      setValue("submissionsOpenAt", submissionsOpenAt, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  };

  const getInitialSubmissionWindow = () => {
    if (!bounty?.submissionsOpenAt || !bounty?.endsAt) return null;
    const days = Math.ceil(
      (new Date(bounty.endsAt).getTime() -
        new Date(bounty.submissionsOpenAt).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    return days >= 2 && days <= 14 ? days : null;
  };

  const handleSubmissionWindowToggle = (checked: boolean) => {
    if (checked) {
      const val = getInitialSubmissionWindow() ?? 2;
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

  const handleEndDateModeChange = (mode: EndDateMode) => {
    setValue("endDateMode", mode, { shouldDirty: true });
    if (mode === "fixed-end-date") {
      setValue("submissionFrequency", undefined, { shouldDirty: true });
      setValue("maxSubmissions", null, { shouldDirty: true });
      setValue("submissionsOpenAt", null, { shouldDirty: true });
    } else {
      setValue("submissionFrequency", "week", { shouldDirty: true });
      setValue("maxSubmissions", 2, { shouldDirty: true });
      setValue("endsAt", null, { shouldDirty: true });
    }
  };

  const handleTotalSubmissionsAllowedChange = (value: number) => {
    setValue("maxSubmissions", value, { shouldDirty: true });
  };

  const validationError = useMemo(() => {
    const now = new Date();

    if (startsAt && startsAt !== bounty?.startsAt) {
      const startDate = new Date(startsAt);
      if (startDate < now) {
        return "Please choose a start date that is in the future.";
      }
    }

    const effectiveStartDate = startsAt ? new Date(startsAt) : now;

    if (endsAt) {
      const endDate = new Date(endsAt);

      if (endDate <= effectiveStartDate) {
        return `Please choose an end date that is after the start date (${formatDate(effectiveStartDate)}).`;
      }

      const minEndDate = new Date(
        effectiveStartDate.getTime() + 60 * 60 * 1000,
      );
      if (endDate < minEndDate) {
        return "End date must be at least 1 hour after the start date.";
      }
    }

    if (type === "submission" && isRepeatMode) {
      const total = totalSubmissionsAllowedVal ?? 2;
      if (total < 2 || total > 10) {
        return "Total submissions allowed must be between 2 and 10.";
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
        const isSocialMetrics =
          submissionRequirements &&
          typeof submissionRequirements === "object" &&
          "socialMetrics" in submissionRequirements;
        if (!isSocialMetrics) {
          if (!rewardDescription?.trim()) {
            return "Reward description is required for custom rewards.";
          }
          if (rewardDescription && rewardDescription.length > 100) {
            return "Reward description must be 100 characters or less.";
          }
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
    submissionWindow,
    rewardAmount,
    rewardDescription,
    isRepeatMode,
    rewardType,
    type,
    name,
    description,
    performanceCondition?.attribute,
    performanceCondition?.operator,
    performanceCondition?.value,
    submissionRequirements,
    totalSubmissionsAllowedVal,
  ]);

  const performSubmit = async ({
    sendNotificationEmails,
  }: { sendNotificationEmails?: boolean } = {}) => {
    if (!workspaceId) return;

    const {
      rewardType: formRewardType,
      submissionCriteriaType: _submissionCriteriaType,
      ...data
    } = form.getValues();

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

      if (isRepeatMode) {
        data.submissionFrequency = submissionFrequency ?? "week";
        data.maxSubmissions = totalSubmissionsAllowedVal ?? 2;
        data.endsAt = null;
        data.submissionsOpenAt = null;
      } else {
        data.submissionFrequency = undefined;
        data.maxSubmissions = undefined;
      }

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
            startsAt: startsAt || new Date(),
            endsAt: endsAt || null,
            rewardAmount: rewardAmount ? rewardAmount * 100 : null,
            rewardDescription: rewardDescription || null,
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
    hasStartDate,
    setHasStartDate,
    hasEndDate,
    handleEndDateToggle,
    openAccordions,
    setOpenAccordions,
    endDateMode,
    isRepeatMode,
    maxSubmissions,
    submissionFrequency,
    type,
    name,
    control,
    register,
    setValue,
    watch,
    errors,
    isDirty,
    handleStartDateToggle,
    handleEndDateChange,
    handleEndDateModeChange,
    handleTotalSubmissionsAllowedChange,
    submissionWindow,
    handleSubmissionWindowToggle,
    handleSubmissionWindowChange,
    validationError,
    confirmCreateBountyModal,
    setShowConfirmCreateBountyModal,
    onSubmit,
    isSubmitting,
  };
}
