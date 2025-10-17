import { GroupProps } from "@/lib/types";
import { getResourceColorData, RAINBOW_CONIC_GRADIENT } from "@/ui/colors";
import { cn } from "@dub/utils";

export function GroupColorCircle({
  group,
}: {
  group: Pick<GroupProps, "color">;
}) {
  const colorClassName = group.color
    ? getResourceColorData(group.color)?.groupVariants
    : undefined;

  return (
    <div
      className={cn("size-3 shrink-0 rounded-full", colorClassName)}
      {...(!colorClassName && {
        style: {
          background: RAINBOW_CONIC_GRADIENT,
        },
      })}
    />
  );
}
