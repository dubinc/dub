import { SVGProps, useEffect, useRef } from "react";

export function NewQRIcon({
  "data-hovered": hovered,
  ...rest
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
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      ref={ref}
      {...rest}
    >
      <path
        d="M1.66675 9.99996C1.66675 6.07163 1.66675 4.10746 2.88675 2.88663C4.10841 1.66663 6.07175 1.66663 10.0001 1.66663C13.9284 1.66663 15.8926 1.66663 17.1126 2.88663C18.3334 4.10829 18.3334 6.07163 18.3334 9.99996C18.3334 13.9283 18.3334 15.8925 17.1126 17.1125C15.8934 18.3333 13.9284 18.3333 10.0001 18.3333C6.07175 18.3333 4.10758 18.3333 2.88675 17.1125C1.66675 15.8933 1.66675 13.9283 1.66675 9.99996Z"
        stroke="#6E7275"
        stroke-width="1.25"
      />
      <path
        d="M12.5 10H10M10 10H7.5M10 10V7.5M10 10V12.5"
        stroke="#6E7275"
        stroke-width="1.25"
        stroke-linecap="round"
      />
    </svg>
  );
}
