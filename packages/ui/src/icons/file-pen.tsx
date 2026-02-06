import { SVGProps } from "react";

export function FilePen(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      fill="none"
      viewBox="0 0 16 16"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      {...props}
    >
      <g clipPath="url(#clip0_file_pen)">
        <path d="M5.11133 6H6.88911" />
        <path d="M5.11133 8.66602H9.11133" />
        <path d="M13.4757 5.55386H10.4446C9.95389 5.55386 9.55566 5.15563 9.55566 4.66497V1.64453" />
        <path d="M13.5554 7.14634V5.92279C13.5554 5.68714 13.4621 5.46056 13.295 5.29434L9.81589 1.81513C9.64878 1.64802 9.423 1.55469 9.18745 1.55469H4.22211C3.23989 1.55469 2.44434 2.35113 2.44434 3.33247V12.6658C2.44434 13.6471 3.23989 14.4436 4.22211 14.4436H7.2582" />
        <path d="M12.2625 14.6254L15.0725 11.8155C15.4196 11.4683 15.4196 10.9055 15.0725 10.5584L14.5517 10.0377C14.2046 9.69057 13.6418 9.69057 13.2947 10.0377L10.4847 12.8476L9.77734 15.3329L12.2625 14.6254Z" />
      </g>
      <defs>
        <clipPath id="clip0_file_pen">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}
