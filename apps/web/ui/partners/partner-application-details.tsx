import { getProgramApplicationRejectionReasonLabel } from "@/lib/partners/program-application-rejection";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramApplication } from "@dub/prisma/client";
import { CircleHalfDottedClock, Combobox, ComboboxOption } from "@dub/ui";
import { cn, fetcher, formatDate, formatDateTime } from "@dub/utils";
import Linkify from "linkify-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { formatApplicationFormData } from "../../lib/partners/format-application-form-data";

type ApplicationHistoryResponse = {
  applications: {
    id: string;
    createdAt: string;
    reviewedAt: string | null;
  }[];
};

function PartnerApplicationReviewOutcome({
  application,
}: {
  application: ProgramApplication;
}) {
  const hasApplicationReviewData = Boolean(
    application.rejectionReason || application.rejectionNote?.trim(),
  );

  if (!hasApplicationReviewData) {
    return null;
  }

  const reasonLabel = getProgramApplicationRejectionReasonLabel(
    application.rejectionReason,
  );
  const note = application.rejectionNote?.trim();

  return (
    <>
      <hr className="border-neutral-200" />
      <div className="grid grid-cols-1 gap-5">
        {reasonLabel ? (
          <div>
            <h4 className="text-content-emphasis font-semibold">
              Reason for rejection
            </h4>
            <p className="mt-1.5 text-neutral-600">{reasonLabel}</p>
          </div>
        ) : null}
        {note ? (
          <div>
            <h4 className="text-content-emphasis font-semibold">
              Additional notes
            </h4>
            <p className="mt-1.5 whitespace-pre-wrap text-neutral-600">
              {note}
            </p>
          </div>
        ) : null}
      </div>
    </>
  );
}

function PartnerApplicationReviewFooter({
  reviewedAt,
}: {
  reviewedAt: Date | string | null | undefined;
}) {
  if (!reviewedAt) {
    return null;
  }

  return (
    <div className="mt-4 flex items-center gap-2.5 rounded-lg bg-neutral-100 px-3 py-2.5 text-sm text-neutral-600">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-neutral-200/80">
        <CircleHalfDottedClock className="size-4 text-neutral-500" />
      </div>
      <span>{formatDateTime(reviewedAt)}</span>
    </div>
  );
}

export function PartnerApplicationDetails({
  partnerId,
  preferredApplicationId,
}: {
  partnerId: string;
  preferredApplicationId?: string | null;
}) {
  const { id: workspaceId } = useWorkspace();
  const { program } = useProgram();

  const [selectedApplicationId, setSelectedApplicationId] = useState<
    string | null
  >(null);

  const { data: historyData, isLoading: historyLoading } =
    useSWR<ApplicationHistoryResponse>(
      program && workspaceId && partnerId
        ? `/api/programs/${program.id}/applications/history?partnerId=${encodeURIComponent(partnerId)}&workspaceId=${workspaceId}`
        : null,
      fetcher,
    );

  const historyItems = historyData?.applications ?? [];

  useEffect(() => {
    if (historyLoading || !historyData) {
      return;
    }

    const items = historyData.applications;

    setSelectedApplicationId((prev) => {
      if (items.length === 0) {
        return preferredApplicationId ?? null;
      }

      if (
        preferredApplicationId &&
        items.some((a) => a.id === preferredApplicationId)
      ) {
        return preferredApplicationId;
      }

      if (prev && items.some((a) => a.id === prev)) {
        return prev;
      }

      return items[0]!.id;
    });
  }, [historyLoading, historyData, preferredApplicationId]);

  const applicationKey =
    program &&
    workspaceId &&
    selectedApplicationId &&
    `/api/programs/${program.id}/applications/${selectedApplicationId}?workspaceId=${workspaceId}`;

  const { data: application, isLoading: applicationLoading } =
    useSWR<ProgramApplication>(applicationKey, fetcher);

  const applicationSelectOptions: ComboboxOption[] = useMemo(
    () =>
      historyItems.map((item) => ({
        value: item.id,
        label: `${formatDate(item.createdAt)} application`,
      })),
    [historyItems],
  );

  const selectedComboboxOption = useMemo(() => {
    if (!selectedApplicationId) {
      return null;
    }
    return (
      applicationSelectOptions.find((o) => o.value === selectedApplicationId) ??
      null
    );
  }, [applicationSelectOptions, selectedApplicationId]);

  const setSelectedFromCombobox = useCallback(
    (option: ComboboxOption | null) => {
      if (option) {
        setSelectedApplicationId(option.value);
      }
    },
    [],
  );

  const showHistoryBanner = historyItems.length > 1;
  const showApplicationPicker = historyItems.length > 1;

  if (historyLoading && !historyData) {
    return (
      <div className="grid grid-cols-1 gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-content-emphasis text-lg font-semibold">
            Application
          </h3>
        </div>
        <PartnerApplicationDetailsSkeleton />
      </div>
    );
  }

  if (
    !historyLoading &&
    historyData &&
    historyItems.length === 0 &&
    !preferredApplicationId
  ) {
    return (
      <div className="grid grid-cols-1 gap-4">
        <h3 className="text-content-emphasis text-lg font-semibold">
          Application
        </h3>
        <p className="text-sm text-neutral-500">
          No application submissions on file for this partner.
        </p>
      </div>
    );
  }

  if (!selectedApplicationId) {
    return (
      <div className="grid grid-cols-1 gap-4">
        <h3 className="text-content-emphasis text-lg font-semibold">
          Application
        </h3>
        <PartnerApplicationDetailsSkeleton />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 text-sm">
      {showHistoryBanner ? (
        <div
          className="rounded-lg border border-amber-200/90 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          This partner has applied {historyItems.length} times.
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h3 className="text-content-emphasis text-lg font-semibold">
          Application
        </h3>
        {showApplicationPicker ? (
          <Combobox
            options={applicationSelectOptions}
            selected={selectedComboboxOption}
            setSelected={setSelectedFromCombobox}
            placeholder="Select application"
            hideSearch
            caret
            matchTriggerWidth
            buttonProps={{
              className: cn(
                "h-9 w-full shrink-0 justify-start border border-neutral-300 bg-white px-3 shadow-sm sm:w-[min(100%,280px)]",
                "data-[state=open]:border-neutral-500 data-[state=open]:ring-1 data-[state=open]:ring-neutral-500",
                "focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500",
              ),
            }}
          />
        ) : null}
      </div>

      {applicationLoading || !application ? (
        <PartnerApplicationDetailsSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5">
            {formatApplicationFormData(application).map((field) => (
              <div key={field.title}>
                <h4 className="text-content-emphasis font-semibold">
                  {field.title}
                </h4>
                <div className="mt-2">
                  {field.images && field.images.length > 0 ? (
                    <ApplicationFormImageGrid
                      images={field.images}
                      fieldTitle={field.title}
                    />
                  ) : field.value || field.value === "" ? (
                    <Linkify
                      as="p"
                      options={{
                        target: "_blank",
                        rel: "noopener noreferrer nofollow",
                        className:
                          "underline underline-offset-4 text-sm max-w-prose text-neutral-400 hover:text-neutral-700",
                      }}
                    >
                      {field.value || (
                        <span className="text-content-muted italic">
                          No response provided
                        </span>
                      )}
                    </Linkify>
                  ) : (
                    <div className="h-4 w-28 min-w-0 animate-pulse rounded-md bg-neutral-200" />
                  )}
                </div>
              </div>
            ))}
          </div>
          <PartnerApplicationReviewOutcome application={application} />
          <PartnerApplicationReviewFooter reviewedAt={application.reviewedAt} />
        </>
      )}
    </div>
  );
}

function ApplicationFormImageGrid({
  images,
  fieldTitle,
}: {
  images: string[];
  fieldTitle: string;
}) {
  return (
    <div className="flex flex-wrap gap-4">
      {images.map((imageUrl, idx) => (
        <a
          key={idx}
          className="border-border-subtle hover:border-border-default group relative flex size-14 items-center justify-center rounded-md border bg-white"
          target="_blank"
          href={imageUrl}
          rel="noopener noreferrer"
        >
          <div className="relative size-full overflow-hidden rounded-md">
            <img
              src={imageUrl}
              alt={`${fieldTitle} ${idx + 1}`}
              className="size-full object-cover"
            />
          </div>
          <span className="sr-only">
            {fieldTitle} image {idx + 1}
          </span>
        </a>
      ))}
    </div>
  );
}

function PartnerApplicationDetailsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5">
      {[...Array(3)].map((_, idx) => (
        <div key={idx}>
          <h4 className="text-content-emphasis font-semibold" />
          <div className="h-5 w-32 animate-pulse rounded-md bg-neutral-200" />

          <div className="mt-2">
            <div className="h-4 w-28 min-w-0 animate-pulse rounded-md bg-neutral-200" />
          </div>
        </div>
      ))}
    </div>
  );
}
