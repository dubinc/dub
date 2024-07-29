"use client";

import { generateCsvMapping } from "@/lib/ai/generate-csv-mapping";
import { Button, IconMenu, Popover, Tooltip } from "@dub/ui";
import { Check, LoadingSpinner, Magnifier, TableIcon } from "@dub/ui/src/icons";
import { truncate } from "@dub/utils";
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
    <div className="flex flex-col gap-3">
      <p className="text-sm text-gray-600">
        Please select the column that corresponds to each field:
      </p>
      {(Object.keys(mappableFields) as (keyof typeof mappableFields)[]).map(
        (field) => (
          <FieldRow key={field} field={field} isStreaming={isStreaming} />
        ),
      )}
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

    // Special split handling for domains and keys (should match backend)
    if (field === "domain")
      values = values.map((e) => e.replace(/^https?:\/\//, "").split("/")[0]);
    if (field === "key")
      values = values.map(
        (e) =>
          e
            .replace(/^https?:\/\//, "")
            .split("/")
            .at(-1) as string,
      );

    values = values.map((e) => truncate(e, 16) as string);

    return values;
  }, [firstRows, value]);

  return (
    <div key={field} className="flex items-center justify-between gap-6">
      <span className="text-sm font-medium text-gray-950">
        {label} {required && <span className="text-red-700">*</span>}
      </span>
      <div className="flex min-w-0 items-center">
        <Controller
          control={control}
          name={field}
          rules={{ required }}
          render={({ field }) => (
            <Popover
              align="end"
              content={
                <div className="w-full p-2 md:w-48">
                  {fileColumns?.map((column) => (
                    <button
                      key={column}
                      onClick={() => {
                        field.onChange(column);
                        setIsOpen(false);
                      }}
                      className="flex w-full items-center justify-between space-x-2 rounded-md px-1 py-2 hover:bg-gray-100 active:bg-gray-200"
                    >
                      <IconMenu
                        text={column}
                        icon={<TableIcon className="h-4 w-4 flex-none" />}
                      />
                      {field.value === column && <Check className="h-4 w-4" />}
                    </button>
                  ))}
                </div>
              }
              openPopover={isOpen}
              setOpenPopover={setIsOpen}
            >
              <Button
                variant="secondary"
                className="min-w-16 px-3"
                onClick={() => setIsOpen((o) => !o)}
                disabled={isLoading}
                text={
                  <div className="flex items-center gap-1">
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
        {Boolean(examples?.length) && (
          <div className="-mr-6 ml-2 shrink-0">
            <Tooltip
              content={
                <div className="block px-3 py-2 text-sm">
                  <span className="font-medium text-gray-950">Examples: </span>
                  <span className="text-gray-500">{examples?.join(", ")}</span>
                </div>
              }
            >
              <div>
                <Magnifier className="h-4 w-4 text-gray-400 transition-colors hover:text-gray-500" />
              </div>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  );
}
