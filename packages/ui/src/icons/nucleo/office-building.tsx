import { SVGProps } from "react";

export function OfficeBuilding({
  variant = "outline",
  ...props
}: SVGProps<SVGSVGElement> & { variant?: "outline" | "fill" }) {
  return (
    <svg
      height="18"
      width="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g fill="currentColor">
        {variant === "fill" ? (
          <>
            <path
              d="M2.75 17C2.336 17 2 16.664 2 16.25V4.41199C2 3.70799 2.41899 3.075 3.06799 2.801L7.56799 0.897004C8.10999 0.668004 8.726 0.724988 9.216 1.04999C9.707 1.37499 9.99899 1.921 9.99899 2.509V3.75C9.99899 4.164 9.66299 4.5 9.24899 4.5C8.83499 4.5 8.49899 4.164 8.49899 3.75V2.509C8.49899 2.392 8.42899 2.32799 8.38699 2.29999C8.34499 2.27199 8.259 2.23199 8.151 2.27899L3.651 4.18201C3.559 4.22101 3.49899 4.31099 3.49899 4.41199V16.25C3.49899 16.664 3.164 17 2.75 17Z"
              fill="currentColor"
            />
            <path
              d="M16.25 15.5H16V7.75C16 6.785 15.215 6 14.25 6H8.75C7.785 6 7 6.785 7 7.75V15.5H1.75C1.336 15.5 1 15.836 1 16.25C1 16.664 1.336 17 1.75 17H16.25C16.664 17 17 16.664 17 16.25C17 15.836 16.664 15.5 16.25 15.5ZM11 13.25C11 13.664 10.664 14 10.25 14C9.836 14 9.5 13.664 9.5 13.25V12.75C9.5 12.336 9.836 12 10.25 12C10.664 12 11 12.336 11 12.75V13.25ZM11 10.25C11 10.664 10.664 11 10.25 11C9.836 11 9.5 10.664 9.5 10.25V9.75C9.5 9.336 9.836 9 10.25 9C10.664 9 11 9.336 11 9.75V10.25ZM13.5 13.25C13.5 13.664 13.164 14 12.75 14C12.336 14 12 13.664 12 13.25V12.75C12 12.336 12.336 12 12.75 12C13.164 12 13.5 12.336 13.5 12.75V13.25ZM13.5 10.25C13.5 10.664 13.164 11 12.75 11C12.336 11 12 10.664 12 10.25V9.75C12 9.336 12.336 9 12.75 9C13.164 9 13.5 9.336 13.5 9.75V10.25Z"
              fill="currentColor"
            />
          </>
        ) : (
          <>
            <path
              d="M7.75,16.25V7.75c0-.552,.448-1,1-1h5.5c.552,0,1,.448,1,1v8.5"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
            <path
              d="M2.75,16.25V4.412c0-.402,.24-.765,.61-.921L7.86,1.588c.659-.279,1.39,.205,1.39,.921v1.741"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
            <line
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              x1="1.75"
              x2="16.25"
              y1="16.25"
              y2="16.25"
            />
            <line
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              x1="10.25"
              x2="10.25"
              y1="10.25"
              y2="9.75"
            />
            <line
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              x1="12.75"
              x2="12.75"
              y1="10.25"
              y2="9.75"
            />
            <line
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              x1="10.25"
              x2="10.25"
              y1="13.25"
              y2="12.75"
            />
            <line
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              x1="12.75"
              x2="12.75"
              y1="13.25"
              y2="12.75"
            />
          </>
        )}
      </g>
    </svg>
  );
}
