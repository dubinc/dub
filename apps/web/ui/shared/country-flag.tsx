import { cn } from "@dub/utils";

export function CountryFlag({
  countryCode,
  className,
}: {
  countryCode: string;
  className?: string;
}) {
  return (
    <img
      alt={`${countryCode} flag`}
      src={`https://hatscripts.github.io/circle-flags/flags/${countryCode.toLowerCase()}.svg`}
      className={cn("size-4 shrink-0", className)}
    />
  );
}
