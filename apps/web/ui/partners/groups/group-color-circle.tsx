import useProgram from "@/lib/swr/use-program";
import { GroupProps } from "@/lib/types";

export function GroupColorCircle({
  group,
}: {
  group: Pick<GroupProps, "color">;
}) {
  const { program, loading: isLoadingProgram } = useProgram();

  const color = group.color || program?.brandColor;
  return (
    <div
      className="size-3 shrink-0 rounded-full"
      style={{
        background:
          color ||
          (isLoadingProgram
            ? "#aaa"
            : "conic-gradient(in hsl, #ee535d 0deg, #e9d988 90deg, #9fe0b8 180deg, #bf87e4 270deg, #ee535d 360deg)"),
      }}
    />
  );
}
