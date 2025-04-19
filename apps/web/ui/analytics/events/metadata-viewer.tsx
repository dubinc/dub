import { Button, Tooltip, useCopyToClipboard } from "@dub/ui";
import { cn, truncate } from "@dub/utils";
import { Check, Copy } from "lucide-react";
import { Fragment } from "react";

// Display the event metadata
export function MetadataViewer({
  metadata,
}: {
  metadata: Record<string, any>;
}) {
  const [copied, copyToClipboard] = useCopyToClipboard();

  const displayEntries = Object.entries(metadata)
    .map(([key, value]) => {
      if (typeof value === "object" && value !== null) {
        // Only show nested properties if the parent object has exactly one property
        if (Object.keys(metadata).length === 1) {
          const nestedEntries = Object.entries(value).map(
            ([nestedKey, nestedValue]) => {
              const displayValue =
                typeof nestedValue === "object" && nestedValue !== null
                  ? truncate(JSON.stringify(nestedValue), 20)
                  : truncate(String(nestedValue), 20);
              return `${key}.${nestedKey}: ${displayValue}`;
            },
          );
          // else show the parent object properties
          return nestedEntries;
        }
        return [`${key}: ${truncate(JSON.stringify(value), 20)}`];
      }
      return [`${key}: ${truncate(String(value), 20)}`];
    })
    .flat();

  const hasMoreItems = displayEntries.length > 3;
  const visibleEntries = hasMoreItems
    ? displayEntries.slice(0, 3)
    : displayEntries;

  return (
    <div className="flex items-center gap-2 text-xs text-neutral-600">
      {visibleEntries.map((entry, i) => (
        <Fragment key={i}>
          <span className="rounded-md border border-neutral-200 bg-neutral-100 px-1.5 py-0.5">
            {entry}
          </span>
        </Fragment>
      ))}

      <Tooltip
        content={
          <div className="flex flex-col gap-4 overflow-hidden rounded-md border border-neutral-200 bg-white p-4">
            <div className="flex h-[200px] w-[280px] overflow-hidden rounded-md border border-neutral-200 bg-white sm:h-[300px] sm:w-[350px]">
              <div className="w-full overflow-auto">
                <pre className="p-2 text-xs text-neutral-600">
                  {JSON.stringify(metadata, null, 2)}
                </pre>
              </div>
            </div>
            <Button
              icon={
                <div className="relative size-4">
                  <div
                    className={cn(
                      "absolute inset-0 transition-[transform,opacity]",
                      copied && "translate-y-1 opacity-0",
                    )}
                  >
                    <Copy className="size-4" />
                  </div>
                  <div
                    className={cn(
                      "absolute inset-0 transition-[transform,opacity]",
                      !copied && "translate-y-1 opacity-0",
                    )}
                  >
                    <Check className="size-4" />
                  </div>
                </div>
              }
              className="h-9"
              text={copied ? "Copied metadata" : "Copy metadata"}
              onClick={() => copyToClipboard(JSON.stringify(metadata, null, 2))}
            />
          </div>
        }
        align="start"
      >
        <button
          type="button"
          className="rounded-md border border-neutral-200 bg-white px-1.5 py-0.5 hover:bg-neutral-50"
        >
          {hasMoreItems
            ? `+${displayEntries.length - 3} more`
            : "View metadata"}
        </button>
      </Tooltip>
    </div>
  );
}
