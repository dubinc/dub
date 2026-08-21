import { cn } from "@dub/utils";

export const MaxCharacterCount = ({
  currentLength,
  maxLength,
}: {
  currentLength: number;
  maxLength: number;
}) => {
  const isOverLimit = currentLength > maxLength;

  return (
    <span
      className={cn(
        "mt-1 block text-xs transition-colors duration-75",
        isOverLimit ? "text-red-500" : "text-neutral-500",
      )}
    >
      {currentLength}/{maxLength}
    </span>
  );
};
