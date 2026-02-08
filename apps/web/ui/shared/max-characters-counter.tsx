import { cn, nFormatter } from "@dub/utils";
import { Control, useWatch } from "react-hook-form";

export function MaxCharactersCounter({
  name,
  maxLength,
  control,
  spaced,
  className,
}: {
  name: string;
  maxLength: number;
  control?: Control<any, any>;
  spaced?: boolean;
  className?: string;
}) {
  const value = useWatch({ control, name });

  return (
    <span className={cn("text-content-subtle text-xs tabular-nums", className)}>
      {nFormatter(value?.toString().length || 0, { full: true })}
      {spaced && " "}/{spaced && " "}
      {nFormatter(maxLength, { full: true })}
    </span>
  );
}
