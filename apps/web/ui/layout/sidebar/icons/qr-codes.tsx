import { Icon } from "@iconify/react";
import { SVGProps, useEffect, useRef } from "react";

export function QRCodesIcon({
  "data-hovered": hovered,
  // ...rest
}: { "data-hovered"?: boolean } & SVGProps<SVGSVGElement>) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    if (hovered) {
      ref.current.animate(
        [
          { transform: "rotate(0deg)" },
          { transform: "rotate(10deg)" },
          { transform: "rotate(-10deg)" },
          { transform: "rotate(0deg)" },
        ],
        {
          duration: 300,
        },
      );
    }
  }, [hovered]);

  return (
    <Icon ref={ref} icon="mage:qr-code" className="h-5 w-5 text-neutral-200" />
  );
}
