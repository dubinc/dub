import { SVGProps } from "react";

export function Shop({
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
              d="M16.25 15.5H15V9.95837C15 9.54437 14.664 9.20837 14.25 9.20837C13.836 9.20837 13.5 9.54437 13.5 9.95837V15.5H11V13C11 11.896 10.105 11 9 11C7.895 11 7 11.896 7 13V15.5H4.5V9.95837C4.5 9.54437 4.164 9.20837 3.75 9.20837C3.336 9.20837 3 9.54437 3 9.95837V15.5H1.75C1.336 15.5 1 15.836 1 16.25C1 16.664 1.336 17 1.75 17H16.25C16.664 17 17 16.664 17 16.25C17 15.836 16.664 15.5 16.25 15.5Z"
              fill="currentColor"
            />
            <path
              d="M3.098 1.37878C3.23139 1.1446 3.48018 1 3.74968 1H14.2507C14.5203 1 14.7692 1.14475 14.9026 1.37912L16.8939 4.87912C17.0135 5.08929 17.0244 5.34422 16.9232 5.56383C16.3317 6.84764 15.0378 7.75 13.522 7.75C12.6655 7.75 11.8852 7.45793 11.2611 6.97852C10.6372 7.45789 9.8573 7.75 8.99998 7.75C8.14246 7.75 7.36202 7.4572 6.73799 6.97761C6.11397 7.4572 5.33352 7.75 4.476 7.75C2.95904 7.75 1.66621 6.84751 1.0748 5.56383C0.973561 5.34409 0.984544 5.08901 1.10429 4.87878L3.098 1.37878Z"
              clipRule="evenodd"
              fill="currentColor"
              fillRule="evenodd"
            />
          </>
        ) : (
          <>
            <line
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              x1="3.75"
              x2="3.75"
              y1="16.25"
              y2="9.5"
            />
            <line
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              x1="14.25"
              x2="14.25"
              y1="9.5"
              y2="16.25"
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
            <path
              d="M13.668,1.75H4.331c-.359,0-.691,.193-.869,.505l-1.706,2.995c.475,1.031,1.51,1.75,2.72,1.75,.908,0,1.712-.412,2.262-1.049,.55,.637,1.354,1.049,2.262,1.049s1.711-.411,2.261-1.048c.55,.637,1.354,1.048,2.261,1.048,1.209,0,2.245-.719,2.72-1.75l-1.704-2.995c-.178-.312-.51-.505-.869-.505Z"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
            <path
              d="M7.25,16v-3c0-.966,.784-1.75,1.75-1.75h0c.966,0,1.75,.784,1.75,1.75v3"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
          </>
        )}
      </g>
    </svg>
  );
}
