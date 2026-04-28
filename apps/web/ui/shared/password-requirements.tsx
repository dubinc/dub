import { CircleCheckFill } from "@dub/ui";
import { cn } from "@dub/utils";
import { memo } from "react";
import { useFormContext, useWatch } from "react-hook-form";

const REQUIREMENTS: {
  name: string;
  mobileName?: string;
  check: (password: string) => boolean;
}[] = [
  {
    name: "Number",
    check: (p) => /\d/.test(p),
  },
  {
    name: "Uppercase letter",
    mobileName: "Uppercase",
    check: (p) => /[A-Z]/.test(p),
  },
  {
    name: "Lowercase letter",
    mobileName: "Lowercase",
    check: (p) => /[a-z]/.test(p),
  },
  {
    name: "8 chars",
    check: (p) => p.length >= 8,
  },
];

/**
 * Component to display the password requirements and whether they are each met for a password field.
 *
 * Note: This component must be used within a FormProvider context.
 */
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
    <ul className={cn("mt-2 flex flex-wrap items-center gap-3", className)}>
      {REQUIREMENTS.map(({ name, mobileName, check }) => {
        const checked = password?.length && check(password);

        return (
          <li
            key={name}
            className={cn(
              "flex items-center gap-1 text-xs text-neutral-400 transition-colors",
              checked ? "text-green-600" : errors[field] && "text-red-600",
            )}
          >
            <CircleCheckFill
              className={cn(
                "size-2.5 transition-opacity",
                checked
                  ? "animate-scale-in [--from-scale:1] [--to-scale:1.2] [animation-direction:alternate] [animation-duration:150ms] [animation-iteration-count:2] [animation-timing-function:ease-in-out]"
                  : errors[field]
                    ? "text-red-600"
                    : "text-neutral-200",
              )}
            />
            {mobileName ? (
              <>
                <span className="max-[420px]:hidden">{name}</span>
                <span className="hidden max-[420px]:inline">{mobileName}</span>
              </>
            ) : (
              <span>{name}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
});
