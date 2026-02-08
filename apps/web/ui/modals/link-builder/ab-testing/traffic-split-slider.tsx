import { MIN_TEST_PERCENTAGE } from "@/lib/zod/schemas/links";
import { cn } from "@dub/utils";
import { useCallback, useEffect, useRef, useState } from "react";

export function TrafficSplitSlider({
  testVariants,
  onChange,
}: {
  testVariants: { url: string; percentage: number }[];
  onChange: (percentages: number[]) => void;
}) {
  const [isDragging, setIsDragging] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (index: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(index);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging === null || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const mouseX = e.clientX - containerRect.x;
      const mousePercentage = Math.round((mouseX / containerWidth) * 100);

      // Get sum of percentages to the left and right of the two being affected
      const leftPercentage = testVariants
        .slice(0, Math.max(0, isDragging))
        .reduce((sum, { percentage }) => sum + percentage, 0);
      const rightPercentage = testVariants
        .slice(isDragging + 2)
        .reduce((sum, { percentage }) => sum + percentage, 0);

      let newPercentages = testVariants.map(({ percentage }) => percentage);

      newPercentages[isDragging] = mousePercentage - leftPercentage;
      newPercentages[isDragging + 1] = 100 - rightPercentage - mousePercentage;

      // Ensure minimum 10% for each test
      if (newPercentages.every((p) => p >= MIN_TEST_PERCENTAGE)) {
        onChange(newPercentages);
      }
    },
    [isDragging, testVariants, onChange],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  useEffect(() => {
    if (isDragging !== null) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative h-10",
        isDragging !== null && "cursor-col-resize",
      )}
    >
      <div className="absolute inset-0 flex h-full">
        {testVariants.map((test, i) => (
          <div
            key={i}
            className="@container pointer-events-none relative flex h-full"
            style={{ width: `${test.percentage}%` }}
          >
            {i > 0 && <div className="w-1.5" />}
            <div className="flex h-full grow items-center justify-center gap-2 rounded-md border border-neutral-300 text-xs">
              <span className="text-xs font-semibold text-neutral-900">
                {i + 1}
              </span>
              <span className="@[64px]:block hidden font-medium text-neutral-600">
                {test.percentage}%
              </span>
            </div>
            {i < testVariants.length - 1 && (
              <>
                <div className="w-1.5" />
                <div
                  className="group pointer-events-auto absolute -right-1.5 flex h-full w-3 cursor-col-resize items-center px-1"
                  onMouseDown={handleMouseDown(i)}
                >
                  <div
                    className={cn(
                      "h-2/3 w-1 rounded-full bg-neutral-200",
                      isDragging === i
                        ? "bg-neutral-400"
                        : "group-hover:bg-neutral-300",
                    )}
                  />
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
