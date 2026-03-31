import { cn } from "@dub/utils";
import { SVGProps } from "react";

export function StripeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
      className={cn("text-[#543AFD]", props.className)}
    >
      <path
        d="M8 0.5H24C28.1421 0.5 31.5 3.85786 31.5 8V24C31.5 28.1421 28.1421 31.5 24 31.5H8C3.85786 31.5 0.5 28.1421 0.5 24V8C0.5 3.85786 3.85786 0.5 8 0.5Z"
        fill="currentColor"
      />
      <path
        d="M8 0.5H24C28.1421 0.5 31.5 3.85786 31.5 8V24C31.5 28.1421 28.1421 31.5 24 31.5H8C3.85786 31.5 0.5 28.1421 0.5 24V8C0.5 3.85786 3.85786 0.5 8 0.5Z"
        stroke="#E5E5E5"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9 11.8726L23 9V20.0943L9 23V11.9057V11.8726Z"
        fill="white"
      />
    </svg>
  );
}
