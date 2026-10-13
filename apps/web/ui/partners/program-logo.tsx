import { cn, OG_AVATAR_URL } from "@dub/utils";

export function ProgramLogo({
  program,
  className,
}: {
  program: { name: string; logo: string | null };
  className?: string;
}) {
  return (
    <img
      src={program.logo || `${OG_AVATAR_URL}${program.name}`}
      alt={program.name}
      referrerPolicy="no-referrer"
      className={cn(
        "size-5 shrink-0 rounded-full border border-black/10",
        className,
      )}
    />
  );
}
