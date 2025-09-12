import { Button } from "@dub/ui";
import { cn } from "@dub/utils";

export function ToggleSidePanelButton({
  side = "right",
  isOpen,
  onClick,
}: {
  side?: "left" | "right";
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      onClick={onClick}
      variant="secondary"
      className="size-9 shrink-0 rounded-lg p-0"
      icon={
        <svg
          viewBox="0 0 18 18"
          xmlns="http://www.w3.org/2000/svg"
          className={cn("size-4", side === "left" && "rotate-180")}
        >
          <g fill="currentColor">
            <line
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              x1="11.75"
              x2="11.75"
              y1="2.75"
              y2="15.25"
            />
            <polyline
              fill="none"
              points="5.75 6.5 8.25 9 5.75 11.5"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              className={cn(
                "transition-transform [transform-box:fill-box] [transform-origin:center] [vector-effect:non-scaling-stroke]",
                !isOpen && "-scale-x-100",
              )}
            />
            <rect
              height="12.5"
              width="14.5"
              fill="none"
              rx="2"
              ry="2"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              x="1.75"
              y="2.75"
            />
          </g>
        </svg>
      }
    />
  );
}
