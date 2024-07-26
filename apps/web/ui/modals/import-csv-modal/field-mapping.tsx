import { Button, IconMenu, Popover } from "@dub/ui";
import { Check, Table } from "@dub/ui/src/icons";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Controller } from "react-hook-form";
import { mappableFields, useCsvContext } from ".";

export function FieldMapping() {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-gray-600">
        Please select the column that corresponds to each field:
      </p>
      {(Object.keys(mappableFields) as (keyof typeof mappableFields)[]).map(
        (field) => (
          <FieldRow key={field} field={field} />
        ),
      )}
    </div>
  );
}

function FieldRow({ field }: { field: keyof typeof mappableFields }) {
  const { label, required } = mappableFields[field];

  const { control, fileColumns } = useCsvContext();

  const [isOpen, setIsOpen] = useState(false);

  return (
    <div key={field} className="flex items-center justify-between">
      <span className="text-sm font-medium text-gray-950">
        {label} {required && <span className="text-red-700">*</span>}
      </span>
      <Controller
        control={control}
        name={field}
        rules={{ required }}
        render={({ field }) => (
          <div>
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
                        icon={<Table className="h-4 w-4" />}
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
                className="px-3"
                onClick={() => setIsOpen((o) => !o)}
                text={
                  <div className="flex items-center gap-1">
                    <span className="flex-1 truncate whitespace-nowrap text-left text-gray-800">
                      {field.value || (
                        <span className="text-gray-600">Select column...</span>
                      )}
                    </span>
                    <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-75 group-data-[state=open]:rotate-180" />
                  </div>
                }
              ></Button>
            </Popover>
          </div>
        )}
      />
    </div>
  );
}
