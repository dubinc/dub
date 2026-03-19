import { cn, getAvatarTheme } from "@dub/utils";

const headStyle = {
  backgroundImage:
    "linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(0,0,0,0.2) 100%)",
  boxShadow:
    "inset 6px -5px 11px rgba(0,0,0,0.13), inset -18px -12px 19px rgba(255,255,255,0.4)",
};

const shouldersStyle = {
  backgroundImage:
    "linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(0,0,0,0.2) 100%)",
  boxShadow:
    "inset 10px -12px 19px rgba(0,0,0,0.4), inset -18px -12px 19px rgba(255,255,255,0.4), inset 2px -1px 11px rgba(0,0,0,0.1)",
};

export function Avatar({
  imageUrl,
  identifier,
  className,
}: {
  imageUrl?: string | null;
  identifier: string;
  className?: string;
}) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={identifier}
        className={cn("shrink-0 rounded-full", className)}
      />
    );
  }

  const theme = getAvatarTheme(identifier);

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full",
        className,
      )}
      style={{ background: theme.bg }}
      role="img"
      aria-label={identifier}
    >
      <div className="absolute left-0 top-0 h-full w-full">
        <div
          className="absolute left-[30%] top-[22%] aspect-square w-[40%] rounded-full"
          style={{
            background: theme.fg,
            ...headStyle,
          }}
        />
        <div
          className="absolute left-[10%] top-[70%] h-[40%] w-[80%] rounded-t-full"
          style={{
            background: theme.fg,
            ...shouldersStyle,
          }}
        />
      </div>
    </div>
  );
}
