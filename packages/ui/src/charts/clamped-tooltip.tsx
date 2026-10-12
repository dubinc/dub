import { PropsWithChildren, useLayoutEffect, useRef, useState } from "react";

// Places the tooltip like visx's TooltipWithBounds (next to the anchor, and
// flipped near an edge), then moves it back inside the container. On narrow
// charts a flipped tooltip can still pass the edge of the screen, which moves
// the page on mobile browsers.
export function ClampedTooltip({
  left,
  top,
  offsetLeft,
  offsetTop,
  containerWidth,
  containerHeight,
  children,
}: PropsWithChildren<{
  left: number;
  top: number;
  offsetLeft: number;
  offsetTop: number;
  containerWidth: number;
  containerHeight: number;
}>) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null,
  );

  useLayoutEffect(() => {
    if (!ref.current) return;
    const { offsetWidth: width, offsetHeight: height } = ref.current;
    if (width !== size?.width || height !== size?.height) {
      setSize({ width, height });
    }
  });

  let x = left + offsetLeft;
  let y = top + offsetTop;

  if (size) {
    if (x + size.width > containerWidth) x = left - offsetLeft - size.width;
    if (y + size.height > containerHeight) y = top - offsetTop - size.height;

    x = Math.max(0, Math.min(x, containerWidth - size.width));
    y = Math.max(0, Math.min(y, containerHeight - size.height));
  }

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute left-0 top-0"
      style={{
        transform: `translate(${Math.round(x)}px, ${Math.round(y)}px)`,
        // hidden until measured, so that it does not flash in the wrong place
        visibility: size ? "visible" : "hidden",
      }}
    >
      {children}
    </div>
  );
}
