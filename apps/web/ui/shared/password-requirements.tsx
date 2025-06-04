import { CircleCheckFill } from "@dub/ui";
import { cn } from "@dub/utils";
import { memo } from "react";
import { useFormContext, useWatch } from "react-hook-form";

const REQUIREMENTS: {
  name: string;
  check: (password: string) => boolean;
}[] = [
  {
    name: "Number",
    check: (p) => /\d/.test(p),
  },
  {
    name: "Uppercase letter",
    check: (p) => /[A-Z]/.test(p),
  },
  {
    name: "Lowercase letter",
    check: (p) => /[a-z]/.test(p),
  },
];

export const PasswordRequirements = memo(function PasswordRequirements({
  field = "password",
  className,
}: {
  field?: string;
  className?: string;
}) {
  const {
    formState: { errors },
  } = useFormContext();
  const password = useWatch({ name: field });

  return (
    <div className={cn("mt-2 flex flex-wrap items-center gap-3", className)}>
      {REQUIREMENTS.map(({ name, check }) => {
        const checked = password?.length && check(password);

        return (
          <div
            key={name}
            className={cn(
              "flex items-center gap-1 text-xs text-neutral-400 transition-colors",
              checked ? "text-green-600" : errors[field] && "text-red-600",
            )}
          >
            <CircleCheckFill
              className={cn(
                "size-2.5 transition-opacity",
                !checked &&
                  (errors[field] ? "text-red-600" : "text-neutral-200"),
              )}
            />
            <span>{name}</span>
          </div>
        );
      })}
    </div>
  );
});
