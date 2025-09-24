import { cn } from "@dub/utils";
import { Control, useWatch } from "react-hook-form";

export function MaxCharactersCounter({
  name,
  maxLength,
  control,
  className,
}: {
  name: string;
  maxLength: number;
  control?: Control<any, any>;
  className?: string;
}) {
  const value = useWatch({ control, name });

  return (
    <span className={cn("text-content-subtle text-xs", className)}>
      {value?.toString().length || 0}/{maxLength}
    </span>
  );
}
