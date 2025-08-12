import { getResourceColorData, RAINBOW_CONIC_GRADIENT } from "@/lib/colors";
import { GroupProps } from "@/lib/types";
import { cn } from "@dub/utils";

export function GroupColorCircle({
  group,
}: {
  group: Pick<GroupProps, "color">;
}) {
  return (
    <div
      className={cn(
        "size-3 shrink-0 rounded-full",
        group.color && getResourceColorData(group.color)?.groupVariants,
      )}
      {...(!group.color && {
        style: {
          background: RAINBOW_CONIC_GRADIENT,
        },
      })}
    />
  );
}
