"use client";

import { generateCsvMapping } from "@/lib/ai/generate-csv-mapping";
import { Button, IconMenu, InfoTooltip, Popover, Tooltip } from "@dub/ui";
import {
  ArrowRight,
  Check,
  LoadingSpinner,
  Magnifier,
  TableIcon,
  Xmark,
} from "@dub/ui/src/icons";
import {
  cn,
  formatDate,
  getPrettyUrl,
  parseDateTime,
  truncate,
} from "@dub/utils";
import { readStreamableValue } from "ai/rsc";
import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller } from "react-hook-form";
import { mappableFields, useCsvContext } from ".";

export function FieldMapping() {
  const { fileColumns, firstRows, setValue } = useCsvContext();

  const [isStreaming, setIsStreaming] = useState(true);

  useEffect(() => {
    if (!fileColumns || !firstRows) return;

    generateCsvMapping(fileColumns, firstRows)
      .then(async ({ object }) => {
        setIsStreaming(true);
        for await (const partialObject of readStreamableValue(object)) {
          if (partialObject) {
            Object.entries(partialObject).forEach((entry) => {
              const [field, value] = entry as string[];
              if (
                Object.keys(mappableFields).includes(field) &&
                fileColumns.includes(value)
              ) {
                setValue(field as keyof typeof mappableFields, value, {
                  shouldValidate: true,
                });
              }
            });
          }
        }
      })
      .finally(() => setIsStreaming(false));
  }, [fileColumns, firstRows]);

  return (
    <div>
      <p className="text-sm text-gray-600">
        Please select the column that corresponds to each field:
      </p>
      <div className="mt-4 grid grid-cols-[1fr_min-content_1fr] gap-x-4 gap-y-2">
        {(Object.keys(mappableFields) as (keyof typeof mappableFields)[]).map(
          (field) => (
            <FieldRow key={field} field={field} isStreaming={isStreaming} />
          ),
        )}
      </div>
    </div>
  );
}

function FieldRow({
  field,
  isStreaming,
}: {
  field: keyof typeof mappableFields;
  isStreaming: boolean;
}) {
  const { label, required } = mappableFields[field];

  const { control, watch, fileColumns, firstRows } = useCsvContext();

  const value = watch(field);

  const isLoading = isStreaming && !value;
  const [isOpen, setIsOpen] = useState(false);

  const examples = useMemo(() => {
    if (!firstRows) return [];

    let values = firstRows?.map((row) => row[value]).filter(Boolean);

    switch (field) {
      case "link":
        values = values.map(getPrettyUrl);
        break;
      case "tags":
        // Split by commas
        values = values.map((e) =>
          e
            .split(",")
            .map((e) => e.trim())
            .join(" & "),
        );
        break;
      case "createdAt":
        // Convert to date
        values = values.map((e) => {
          const date = parseDateTime(e);
          if (!date) return e;

          return formatDate(date, {
            month: "short",
          });
        });
        break;
    }

    values = values.map((e) => truncate(e, 32) as string);

    return values;
  }, [firstRows, value]);

  return (
    <>
      <div className="relative flex min-w-0 items-center gap-2">
        <Controller
          control={control}
          name={field}
          rules={{ required }}
          render={({ field }) => (
            <Popover
              align="end"
              content={
                <div className="w-full p-2 md:w-48">
                  {[
                    ...(fileColumns || []),
                    ...(field.value && !required ? ["None"] : []),
                  ]?.map((column) => {
                    const Icon = column !== "None" ? TableIcon : Xmark;
                    return (
                      <button
                        key={column}
                        onClick={() => {
                          field.onChange(column !== "None" ? column : null);
                          setIsOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between space-x-2 rounded-md px-1 py-2 hover:bg-gray-100 active:bg-gray-200",
                          column === "None" && "text-gray-400",
                        )}
                      >
                        <IconMenu
                          text={column}
                          icon={<Icon className="h-4 w-4 flex-none" />}
                        />
                        {field.value === column && (
                          <Check className="h-4 w-4 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              }
              openPopover={isOpen}
              setOpenPopover={setIsOpen}
            >
              <Button
                variant="secondary"
                className="h-9 min-w-0 px-3"
                onClick={() => setIsOpen((o) => !o)}
                disabled={isLoading}
                text={
                  <div className="flex w-full grow items-center justify-between gap-1">
                    <span className="flex-1 truncate whitespace-nowrap text-left text-gray-800">
                      {field.value || (
                        <span className="text-gray-600">Select column...</span>
                      )}
                    </span>
                    {isLoading ? (
                      <LoadingSpinner className="h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 text-gray-400 transition-transform duration-75 group-data-[state=open]:rotate-180" />
                    )}
                  </div>
                }
              />
            </Popover>
          )}
        />
        {Boolean(examples?.length) ? (
          <div className="hidden shrink-0 sm:block">
            <Tooltip
              content={
                <div className="block px-4 py-3 text-sm">
                  <span className="font-medium text-gray-950">
                    Example values:
                  </span>
                  <ul className="mt-0.5">
                    {examples?.map((example, idx) => (
                      <li
                        key={example + idx}
                        className="block text-xs leading-tight text-gray-500"
                      >
                        <span className="translate-y-1 text-base text-gray-600">
                          &bull;
                        </span>{" "}
                        {example}
                      </li>
                    ))}
                  </ul>
                </div>
              }
            >
              <div>
                <Magnifier className="h-4 w-4 text-gray-400 transition-colors hover:text-gray-500" />
              </div>
            </Tooltip>
          </div>
        ) : (
          <div className="w-4 shrink-0" />
        )}
      </div>
      <div className="flex items-center justify-end">
        <ArrowRight className="h-4 w-4 text-gray-500" />
      </div>
      <span className="flex h-9 items-center gap-1 rounded-md border border-gray-200 bg-gray-100 px-3">
        <span className="grow whitespace-nowrap text-sm font-normal text-gray-700">
          {label} {required && <span className="text-red-700">*</span>}
        </span>
        {field === "tags" && (
          <InfoTooltip content="Tags may be comma-separated as long as they're escaped properly in the CSV file." />
        )}
      </span>
    </>
  );
}
