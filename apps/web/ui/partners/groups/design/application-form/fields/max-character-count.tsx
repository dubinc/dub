import { cn } from "@dub/utils";

export const MaxCharacterCount = ({ currentLength, maxLength }: { currentLength: number, maxLength: number }) => {
  const isOverLimit = currentLength > maxLength;
  return (
    <span className={cn(
      "transition-colors duration-75 text-xs",
      isOverLimit ? "text-red-500" : "text-neutral-500"
    )}>
      {currentLength}/{maxLength}
    </span>
  );
};
