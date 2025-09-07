import { SVGProps } from "react";

export function Anthropic({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className={className}
      width="180"
      height="180"
      viewBox="0 0 180 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M103.702 26.4004H130.725L180 150H152.977L103.702 26.4004ZM49.2675 26.4004H77.52L126.795 150H99.24L89.1675 124.043H37.6275L27.5475 149.993H0L49.275 26.4154L49.2675 26.4004ZM80.2575 101.093L63.3975 57.6529L46.5375 101.1H80.25L80.2575 101.093Z"
        fill="currentColor"
      />
    </svg>
  );
}
